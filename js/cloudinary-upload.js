/* M-TECH Premium Gadget Store — reusable Cloudinary media uploader */
(function () {
  "use strict";
  var configCache = null, configPromise = null;
  var mediaIndex = window.MTECH_CLOUDINARY_MEDIA_INDEX || {};
  window.MTECH_CLOUDINARY_MEDIA_INDEX = mediaIndex;

  function configFromFirebase() {
    var cfg = (window.MTECH_CONFIG && MTECH_CONFIG.cloudinary) || {};
    return { cloudName: cfg.cloudName || "", uploadPreset: cfg.uploadPreset || "" };
  }
  async function getConfig() {
    if (configCache && configCache.cloudName && configCache.uploadPreset) return configCache;
    if (configPromise) return configPromise;
    var local = configFromFirebase();
    if (local.cloudName && local.uploadPreset && local.cloudName.indexOf("YOUR_") !== 0 && local.uploadPreset.indexOf("YOUR_") !== 0) {
      configCache = local; return configCache;
    }
    configPromise = fetch("/api/cloudinary/config", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("Cloudinary upload configuration is unavailable."); return r.json(); })
      .then(function (remote) {
        if (!remote.cloudName || !remote.uploadPreset) throw new Error("Cloudinary is not configured yet. Add the required Vercel environment variables.");
        configCache = remote; return remote;
      }).finally(function () { configPromise = null; });
    return configPromise;
  }
  function validateFile(file, options) {
    if (!file) throw new Error("Please choose a file.");
    var allowVideo = !!options.allowVideo;
    var allowed = allowVideo ? ["image/jpeg","image/jpg","image/png","image/webp","video/mp4","video/webm","video/quicktime"] : ["image/jpeg","image/jpg","image/png","image/webp"];
    if (allowed.indexOf(file.type) === -1) throw new Error(allowVideo ? "Unsupported format. Use JPG, PNG, WEBP, MP4, WEBM or MOV." : "Unsupported image format. Allowed formats: JPG, JPEG, PNG, WEBP.");
    var maxBytes = options.maxSizeBytes || (allowVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024);
    if (file.size > maxBytes) throw new Error("File is too large. Please choose a file smaller than " + Math.round(maxBytes / 1024 / 1024) + " MB.");
  }
  function resourceTypeFor(file, options) { return options.resourceType || (String(file.type || "").indexOf("video/") === 0 ? "video" : "image"); }
  function optimizedUrl(url) { return url && url.indexOf("res.cloudinary.com/") !== -1 ? url.replace("/upload/", "/upload/f_auto,q_auto,dpr_auto/") : (url || ""); }
  function remember(result) { if (!result || !result.url) return; mediaIndex[result.url] = result; if (result.optimizedUrl) mediaIndex[result.optimizedUrl] = result; }

  async function uploadFile(file, folder, onProgress, options) {
    options = options || {};
    validateFile(file, options);
    var config = await getConfig();
    var resourceType = resourceTypeFor(file, options);
    var endpoint = "https://api.cloudinary.com/v1_1/" + encodeURIComponent(config.cloudName) + "/" + resourceType + "/upload";
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var controller = options.abortController;
      if (controller && controller.signal) controller.signal.addEventListener("abort", function () { try { xhr.abort(); } catch (_) {} reject(new Error("Upload cancelled.")); }, { once: true });
      xhr.open("POST", endpoint);
      xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onerror = function () { reject(new Error("Network error occurred during upload. Check your internet connection.")); };
      xhr.onabort = function () { reject(new Error("Upload cancelled.")); };
      xhr.onload = function () {
        var body = null; try { body = JSON.parse(xhr.responseText || "{}"); } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300 && body && body.secure_url) {
          var result = { url: body.secure_url, optimizedUrl: optimizedUrl(body.secure_url), publicId: body.public_id || "", resourceType: body.resource_type || resourceType, format: body.format || "", width: body.width || null, height: body.height || null, bytes: body.bytes || file.size, duration: body.duration || null };
          remember(result); resolve(result); return;
        }
        reject(new Error(body && body.error && body.error.message ? body.error.message : "Upload failed with status code " + xhr.status + "."));
      };
      var data = new FormData(); data.append("file", file); data.append("upload_preset", config.uploadPreset); if (folder) data.append("folder", folder); xhr.send(data);
    });
  }

  function createUploader(containerId, options) {
    options = options || {};
    var container = document.getElementById(containerId); if (!container) return null;
    var currentFolder = options.folder || "m-tech/general", maxFiles = options.maxFiles || 8;
    var allowVideo = !!options.allowVideo, maxSizeBytes = options.maxSizeBytes || (allowVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024);
    var onFilesChanged = options.onChange || function () {}, selectedFiles = [];
    container.innerHTML = '<div class="cloudinary-uploader" style="border:2px dashed var(--line-strong);border-radius:var(--radius);padding:26px;text-align:center;background:var(--off);transition:border-color .2s ease">' +
      '<input type="file" class="uploader-input" accept="' + (allowVideo ? 'image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/jpg,image/png,image/webp') + '" style="display:none" ' + (maxFiles > 1 ? "multiple" : "") + '>' +
      '<div class="uploader-dropzone" style="cursor:pointer;padding:20px 10px"><div style="font-size:2.2rem;color:var(--grey);margin-bottom:8px">' + (allowVideo ? "🎞️" : "📷") + '</div><p style="font-weight:600;margin-bottom:4px;font-size:.95rem">Select or drag files here</p><p style="font-size:.78rem;color:var(--ink-55)">' + (allowVideo ? "JPG, PNG, WEBP, MP4, WEBM or MOV" : "JPG, JPEG, PNG or WEBP") + " · Max " + Math.round(maxSizeBytes / 1024 / 1024) + "MB · Up to " + maxFiles + " file(s)</p></div><div class="uploader-previews" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:14px;margin-top:18px"></div></div>';
    var dropzone = container.querySelector(".uploader-dropzone"), input = container.querySelector(".uploader-input"), previews = container.querySelector(".uploader-previews"), box = container.querySelector(".cloudinary-uploader");

    function addFiles(list) {
      var remaining = maxFiles - selectedFiles.length; if (remaining <= 0) { alert("Maximum " + maxFiles + " file(s) allowed."); return; }
      Array.from(list).slice(0, remaining).forEach(function (file) {
        try { validateFile(file, { allowVideo: allowVideo, maxSizeBytes: maxSizeBytes }); } catch (e) { alert('"' + file.name + '": ' + e.message); return; }
        selectedFiles.push({ id: Math.random().toString(36).slice(2,10), file: file, url: URL.createObjectURL(file), isUploaded: false, isMain: selectedFiles.length === 0, progress: 0, error: null, remoteUrl: "", optimizedUrl: "", publicId: "", resourceType: resourceTypeFor(file, options), abortController: null });
      }); render(); onFilesChanged(selectedFiles);
    }
    function removeFile(id) {
      var i = selectedFiles.findIndex(function (f) { return f.id === id; }); if (i < 0) return;
      if (selectedFiles[i].abortController) selectedFiles[i].abortController.abort();
      if (selectedFiles[i].url && selectedFiles[i].url.indexOf("blob:") === 0) URL.revokeObjectURL(selectedFiles[i].url);
      var wasMain = selectedFiles[i].isMain; selectedFiles.splice(i,1); if (wasMain && selectedFiles[0]) selectedFiles[0].isMain = true; render(); onFilesChanged(selectedFiles);
    }
    function setMain(id) { selectedFiles.forEach(function (f) { f.isMain = f.id === id; }); render(); onFilesChanged(selectedFiles); }
    function render() {
      previews.innerHTML = ""; previews.style.display = selectedFiles.length ? "grid" : "none";
      selectedFiles.forEach(function (f) {
        var card = document.createElement("div"); card.className = "preview-card"; card.style.cssText = "position:relative;border:1px solid var(--line);border-radius:var(--radius-sm);padding:6px;background:#fff;display:flex;flex-direction:column;align-items:center;box-shadow:var(--shadow-sm)";
        var src = f.isUploaded ? (f.optimizedUrl || f.remoteUrl) : f.url;
        var media = f.resourceType === "video" ? '<video src="' + src + '" controls muted playsinline style="width:100%;height:100%;object-fit:cover"></video>' : '<img src="' + src + '" alt="" style="width:100%;height:100%;object-fit:contain">';
        card.innerHTML = '<div style="width:100%;aspect-ratio:1/1;border-radius:var(--radius-xs);overflow:hidden;background:var(--off);position:relative">' + media + (f.isMain ? '<span style="position:absolute;bottom:4px;left:4px;background:var(--ink);color:#fff;font-size:.6rem;font-weight:700;padding:2px 6px;border-radius:99px">MAIN</span>' : '') + '<button type="button" class="remove-btn" aria-label="Remove file" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:0;cursor:pointer">&times;</button>' + (f.progress > 0 && !f.isUploaded && !f.error ? '<div style="position:absolute;inset:6px;background:rgba(255,255,255,.85);display:grid;place-items:center;border-radius:var(--radius-sm);font-size:.72rem;font-weight:700">' + f.progress + '%</div>' : '') + (f.error ? '<div style="position:absolute;inset:6px;background:rgba(253,240,240,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:var(--radius-sm);padding:5px;text-align:center"><span style="font-size:.63rem;color:#95271f;font-weight:700">' + String(f.error).replace(/[<>]/g, "") + '</span><button type="button" class="retry-btn" style="margin-top:5px;font-size:.6rem;background:var(--ink);color:#fff;border:0;padding:3px 7px;border-radius:4px">Retry</button></div>' : '') + '</div><div style="display:flex;gap:5px;width:100%;margin-top:6px"><button type="button" class="main-btn" ' + (f.isMain ? "disabled" : "") + ' style="flex:1;font-size:.65rem">' + (f.isMain ? "Main" : "Make main") + '</button></div>';
        card.querySelector(".remove-btn").onclick = function () { removeFile(f.id); }; card.querySelector(".main-btn").onclick = function () { setMain(f.id); };
        var retry = card.querySelector(".retry-btn"); if (retry) retry.onclick = function () { uploadOne(f); }; previews.appendChild(card);
      });
    }
    async function uploadOne(f) {
      if (!f.file) return; f.error = null; f.progress = 0; f.abortController = new AbortController(); render();
      try { var result = await uploadFile(f.file, currentFolder, function (p) { f.progress = p; render(); }, { allowVideo: allowVideo, maxSizeBytes: maxSizeBytes, resourceType: options.resourceType, abortController: f.abortController }); f.isUploaded = true; f.remoteUrl = result.url; f.optimizedUrl = result.optimizedUrl; f.publicId = result.publicId; f.resourceType = result.resourceType; f.progress = 100; remember(result); }
      catch (e) { f.error = e.message; }
      f.abortController = null; render(); onFilesChanged(selectedFiles);
    }
    dropzone.addEventListener("click", function () { input.click(); }); dropzone.addEventListener("dragover", function (e) { e.preventDefault(); box.style.borderColor = "var(--ink)"; }); dropzone.addEventListener("dragleave", function () { box.style.borderColor = "var(--line-strong)"; }); dropzone.addEventListener("drop", function (e) { e.preventDefault(); box.style.borderColor = "var(--line-strong)"; if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }); input.addEventListener("change", function (e) { if (e.target.files.length) addFiles(e.target.files); input.value = ""; });
    var api = {
      getFiles: function () { return selectedFiles; }, getUrls: function () { return selectedFiles.filter(function (f) { return f.isUploaded; }).map(function (f) { return f.optimizedUrl || f.remoteUrl; }); },
      getMedia: function () { return selectedFiles.filter(function (f) { return f.isUploaded; }).map(function (f) { return { url: f.optimizedUrl || f.remoteUrl, originalUrl: f.remoteUrl, publicId: f.publicId || "", resourceType: f.resourceType || "image" }; }); },
      getPublicIds: function () { return selectedFiles.filter(function (f) { return f.isUploaded && f.publicId; }).map(function (f) { return f.publicId; }); },
      getThumbnail: function () { var main = selectedFiles.find(function (f) { return f.isMain && f.isUploaded; }) || selectedFiles.find(function (f) { return f.isUploaded; }); return main ? (main.optimizedUrl || main.remoteUrl) : ""; },
      hasPending: function () { return selectedFiles.some(function (f) { return !f.isUploaded && !f.error && f.file; }); }, hasErrors: function () { return selectedFiles.some(function (f) { return !!f.error; }); },
      setFolder: function (folder) { currentFolder = folder || "m-tech/general"; }, uploadAll: async function () { var pending = selectedFiles.filter(function (f) { return !f.isUploaded && f.file; }); await Promise.all(pending.map(uploadOne)); return api.getUrls(); },
      setFiles: function (existing) { selectedFiles.forEach(function (f) { if (f.url && f.url.indexOf("blob:") === 0) URL.revokeObjectURL(f.url); }); selectedFiles = (existing || []).map(function (item,index) { var media = typeof item === "string" ? { url:item, originalUrl:item, publicId:"", resourceType:"image" } : item; remember(media); return { id:Math.random().toString(36).slice(2,10), file:null, url:media.url, remoteUrl:media.originalUrl || media.url, optimizedUrl:media.url, publicId:media.publicId || "", resourceType:media.resourceType || "image", isUploaded:true, isMain:index===0, progress:100, error:null, abortController:null }; }); render(); onFilesChanged(selectedFiles); }
    };
    Object.defineProperty(api, "folder", { get:function(){return currentFolder;}, set:function(v){currentFolder=v || currentFolder;} });
    return api;
  }
  window.MTECH_CLOUDINARY = { getConfig:getConfig, uploadFile:uploadFile, createUploader:createUploader, optimizedUrl:optimizedUrl, getMediaForUrls:function(urls){return (urls||[]).map(function(url){return mediaIndex[url] || {url:url,publicId:"",resourceType:"image"};});}, getKnownMedia:function(url){return mediaIndex[url] || null;} };
})();
