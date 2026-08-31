/* M-TECH Premium Gadget Store — reusable Cloudinary media uploader */
(function () {
  "use strict";

  var configCache = null;
  var configPromise = null;
  var mediaIndex = window.MTECH_CLOUDINARY_MEDIA_INDEX || {};
  window.MTECH_CLOUDINARY_MEDIA_INDEX = mediaIndex;

  function configFromFirebase() {
    var cfg = (window.MTECH_CONFIG && window.MTECH_CONFIG.cloudinary) || {};
    return {
      cloudName: cfg.cloudName || "",
      uploadPreset: cfg.uploadPreset || ""
    };
  }

  async function getConfig() {
    if (configCache && configCache.cloudName && configCache.uploadPreset) return configCache;
    if (configPromise) return configPromise;

    var local = configFromFirebase();
    if (local.cloudName && local.uploadPreset &&
        local.cloudName.indexOf("YOUR_") !== 0 &&
        local.uploadPreset.indexOf("YOUR_") !== 0) {
      configCache = local;
      return configCache;
    }

    configPromise = fetch("/api/cloudinary/config", {
      credentials: "same-origin",
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Cloudinary upload configuration is unavailable.");
        return response.json();
      })
      .then(function (remote) {
        if (!remote.cloudName || !remote.uploadPreset) {
          throw new Error("Cloudinary is not configured yet. Add the required Vercel environment variables.");
        }
        configCache = remote;
        return remote;
      })
      .finally(function () {
        configPromise = null;
      });

    return configPromise;
  }

  function validateFile(file, options) {
    options = options || {};
    if (!file) throw new Error("Please choose a file.");

    var allowVideo = !!options.allowVideo;
    var allowed = allowVideo
      ? ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"]
      : ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (allowed.indexOf(file.type) === -1) {
      throw new Error(allowVideo
        ? "Unsupported format. Use JPG, PNG, WEBP, MP4, WEBM or MOV."
        : "Unsupported image format. Allowed formats: JPG, JPEG, PNG, WEBP.");
    }

    var maxBytes = options.maxSizeBytes || (allowVideo ? 100 : 5) * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error("File is too large. Please choose a file smaller than " +
        Math.round(maxBytes / 1024 / 1024) + " MB.");
    }
  }

  function resourceTypeFor(file, options) {
    options = options || {};
    return options.resourceType ||
      (String(file.type || "").indexOf("video/") === 0 ? "video" : "image");
  }

  function optimizedUrl(url) {
    if (!url || url.indexOf("res.cloudinary.com/") === -1) return url || "";
    return url.replace("/upload/", "/upload/f_auto,q_auto,dpr_auto/");
  }

  function remember(result) {
    if (!result || !result.url) return;
    mediaIndex[result.url] = result;
    if (result.optimizedUrl) mediaIndex[result.optimizedUrl] = result;
  }

  async function uploadFile(file, folder, onProgress, options) {
    options = options || {};
    validateFile(file, options);

    var config = await getConfig();
    var resourceType = resourceTypeFor(file, options);
    var endpoint = "https://api.cloudinary.com/v1_1/" +
      encodeURIComponent(config.cloudName) + "/" + resourceType + "/upload";

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var controller = options.abortController;
      var settled = false;

      function fail(error) {
        if (settled) return;
        settled = true;
        reject(error instanceof Error ? error : new Error(String(error)));
      }

      if (controller && controller.signal) {
        controller.signal.addEventListener("abort", function () {
          try { xhr.abort(); } catch (_) {}
          fail(new Error("Upload cancelled."));
        }, { once: true });
      }

      xhr.open("POST", endpoint);
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onerror = function () {
        fail(new Error("Network error occurred during upload. Check your internet connection."));
      };
      xhr.onabort = function () {
        fail(new Error("Upload cancelled."));
      };
      xhr.onload = function () {
        var body = null;
        try { body = JSON.parse(xhr.responseText || "{}"); } catch (_) {}

        if (xhr.status >= 200 && xhr.status < 300 && body && body.secure_url) {
          if (settled) return;
          settled = true;
          var result = {
            url: body.secure_url,
            optimizedUrl: optimizedUrl(body.secure_url),
            publicId: body.public_id || "",
            resourceType: body.resource_type || resourceType,
            format: body.format || "",
            width: body.width || null,
            height: body.height || null,
            bytes: body.bytes || file.size,
            duration: body.duration || null
          };
          remember(result);
          resolve(result);
          return;
        }

        fail(new Error(
          body && body.error && body.error.message
            ? body.error.message
            : "Upload failed with status code " + xhr.status + "."
        ));
      };

      var form = new FormData();
      form.append("file", file);
      form.append("upload_preset", config.uploadPreset);
      if (folder) form.append("folder", folder);
      xhr.send(form);
    });
  }

  function createUploader(containerId, options) {
    options = options || {};
    var container = document.getElementById(containerId);
    if (!container) return null;

    var currentFolder = options.folder || "m-tech/general";
    var maxFiles = options.maxFiles || 8;
    var allowVideo = !!options.allowVideo;
    var maxSizeBytes = options.maxSizeBytes || (allowVideo ? 100 : 5) * 1024 * 1024;
    var onFilesChanged = options.onChange || function () {};
    var selectedFiles = [];

    container.innerHTML =
      '<div class="cloudinary-uploader" style="border:2px dashed var(--line-strong);border-radius:var(--radius);padding:26px;text-align:center;background:var(--off);transition:border-color .2s ease">' +
        '<input type="file" class="uploader-input" accept="' +
          (allowVideo
            ? 'image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime'
            : 'image/jpeg,image/jpg,image/png,image/webp') +
          '" style="display:none" ' + (maxFiles > 1 ? "multiple" : "") + '>' +
        '<div class="uploader-dropzone" style="cursor:pointer;padding:20px 10px">' +
          '<div style="font-size:2.2rem;color:var(--grey);margin-bottom:8px">' +
            (allowVideo ? "🎞️" : "📷") +
          '</div>' +
          '<p style="font-weight:600;margin-bottom:4px;font-size:.95rem">Select or drag files here</p>' +
          '<p style="font-size:.78rem;color:var(--ink-55)">' +
            (allowVideo ? "JPG, PNG, WEBP, MP4, WEBM or MOV" : "JPG, JPEG, PNG or WEBP") +
            " · Max " + Math.round(maxSizeBytes / 1024 / 1024) + "MB · Up to " + maxFiles + " file(s)</p>" +
        '</div>' +
        '<div class="uploader-previews" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:14px;margin-top:18px"></div>' +
      '</div>';

    var dropzone = container.querySelector(".uploader-dropzone");
    var input = container.querySelector(".uploader-input");
    var previews = container.querySelector(".uploader-previews");
    var box = container.querySelector(".cloudinary-uploader");

    function addFiles(list) {
      var remaining = maxFiles - selectedFiles.length;
      if (remaining <= 0) {
        alert("Maximum " + maxFiles + " file(s) allowed.");
        return;
      }

      Array.from(list).slice(0, remaining).forEach(function (file) {
        try {
          validateFile(file, { allowVideo: allowVideo, maxSizeBytes: maxSizeBytes });
        } catch (error) {
          alert('"' + file.name + '": ' + error.message);
          return;
        }

        selectedFiles.push({
          id: Math.random().toString(36).slice(2, 10),
          file: file,
          url: URL.createObjectURL(file),
          isUploaded: false,
          isMain: selectedFiles.length === 0,
          progress: 0,
          error: null,
          remoteUrl: "",
          optimizedUrl: "",
          publicId: "",
          resourceType: resourceTypeFor(file, options),
          abortController: null
        });
      });

      render();
      onFilesChanged(selectedFiles);
    }

    function removeFile(id) {
      var index = selectedFiles.findIndex(function (file) { return file.id === id; });
      if (index < 0) return;

      if (selectedFiles[index].abortController) {
        selectedFiles[index].abortController.abort();
      }
      if (selectedFiles[index].url && selectedFiles[index].url.indexOf("blob:") === 0) {
        URL.revokeObjectURL(selectedFiles[index].url);
      }

      var wasMain = selectedFiles[index].isMain;
      selectedFiles.splice(index, 1);
      if (wasMain && selectedFiles[0]) selectedFiles[0].isMain = true;
      render();
      onFilesChanged(selectedFiles);
    }

    function setMain(id) {
      selectedFiles.forEach(function (file) {
        file.isMain = file.id === id;
      });
      render();
      onFilesChanged(selectedFiles);
    }

    function render() {
      previews.innerHTML = "";
      previews.style.display = selectedFiles.length ? "grid" : "none";

      selectedFiles.forEach(function (file) {
        var card = document.createElement("div");
        card.className = "preview-card";
        card.style.cssText = "position:relative;border:1px solid var(--line);border-radius:var(--radius-sm);padding:6px;background:#fff;display:flex;flex-direction:column;align-items:center;box-shadow:var(--shadow-sm)";

        var src = file.isUploaded ? (file.optimizedUrl || file.remoteUrl) : file.url;
        var media = file.resourceType === "video"
          ? '<video src="' + src + '" controls muted playsinline style="width:100%;height:100%;object-fit:cover"></video>'
          : '<img src="' + src + '" alt="" style="width:100%;height:100%;object-fit:contain">';

        var mainBadge = file.isMain
          ? '<span style="position:absolute;bottom:4px;left:4px;background:var(--ink);color:#fff;font-size:.6rem;font-weight:700;padding:2px 6px;border-radius:99px">MAIN</span>'
          : "";
        var removeButton = '<button type="button" class="remove-btn" aria-label="Remove file" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:0;cursor:pointer">&times;</button>';
        var progress = file.progress > 0 && !file.isUploaded && !file.error
          ? '<div style="position:absolute;inset:6px;background:rgba(255,255,255,.85);display:grid;place-items:center;border-radius:var(--radius-sm);font-size:.72rem;font-weight:700">' + file.progress + '%</div>'
          : "";
        var error = file.error
          ? '<div style="position:absolute;inset:6px;background:rgba(253,240,240,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:var(--radius-sm);padding:5px;text-align:center"><span style="font-size:.63rem;color:#95271f;font-weight:700">' + String(file.error).replace(/[<>]/g, "") + '</span><button type="button" class="retry-btn" style="margin-top:5px;font-size:.6rem;background:var(--ink);color:#fff;border:0;padding:3px 7px;border-radius:4px">Retry</button></div>'
          : "";

        card.innerHTML =
          '<div style="width:100%;aspect-ratio:1/1;border-radius:var(--radius-xs);overflow:hidden;background:var(--off);position:relative">' +
            media + mainBadge + removeButton + progress + error +
          '</div>' +
          '<div style="display:flex;gap:5px;width:100%;margin-top:6px">' +
            '<button type="button" class="main-btn" ' + (file.isMain ? "disabled" : "") + ' style="flex:1;font-size:.65rem">' +
              (file.isMain ? "Main" : "Make main") +
            '</button>' +
          '</div>';

        card.querySelector(".remove-btn").onclick = function () { removeFile(file.id); };
        card.querySelector(".main-btn").onclick = function () { setMain(file.id); };
        var retry = card.querySelector(".retry-btn");
        if (retry) retry.onclick = function () { uploadOne(file); };
        previews.appendChild(card);
      });
    }

    async function uploadOne(file) {
      if (!file.file) return;
      file.error = null;
      file.progress = 0;
      file.abortController = new AbortController();
      render();

      try {
        var result = await uploadFile(
          file.file,
          currentFolder,
          function (progress) {
            file.progress = progress;
            render();
          },
          {
            allowVideo: allowVideo,
            maxSizeBytes: maxSizeBytes,
            resourceType: options.resourceType,
            abortController: file.abortController
          }
        );

        file.isUploaded = true;
        file.remoteUrl = result.url;
        file.optimizedUrl = result.optimizedUrl;
        file.publicId = result.publicId;
        file.resourceType = result.resourceType;
        file.progress = 100;
        remember(result);
      } catch (error) {
        file.error = error && error.message ? error.message : String(error);
      }

      file.abortController = null;
      render();
      onFilesChanged(selectedFiles);
    }

    dropzone.addEventListener("click", function () { input.click(); });
    dropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      box.style.borderColor = "var(--ink)";
    });
    dropzone.addEventListener("dragleave", function () {
      box.style.borderColor = "var(--line-strong)";
    });
    dropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      box.style.borderColor = "var(--line-strong)";
      if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
    });
    input.addEventListener("change", function (event) {
      if (event.target.files.length) addFiles(event.target.files);
      input.value = "";
    });

    var api = {
      getFiles: function () { return selectedFiles; },
      getUrls: function () {
        return selectedFiles.filter(function (file) { return file.isUploaded; })
          .map(function (file) { return file.optimizedUrl || file.remoteUrl; });
      },
      getMedia: function () {
        return selectedFiles.filter(function (file) { return file.isUploaded; })
          .map(function (file) {
            return {
              url: file.optimizedUrl || file.remoteUrl,
              originalUrl: file.remoteUrl,
              publicId: file.publicId || "",
              resourceType: file.resourceType || "image"
            };
          });
      },
      getPublicIds: function () {
        return selectedFiles.filter(function (file) { return file.isUploaded && file.publicId; })
          .map(function (file) { return file.publicId; });
      },
      getThumbnail: function () {
        var main = selectedFiles.find(function (file) { return file.isMain && file.isUploaded; }) ||
          selectedFiles.find(function (file) { return file.isUploaded; });
        return main ? (main.optimizedUrl || main.remoteUrl) : "";
      },
      hasPending: function () {
        return selectedFiles.some(function (file) { return !file.isUploaded && !file.error && file.file; });
      },
      hasErrors: function () {
        return selectedFiles.some(function (file) { return !!file.error; });
      },
      setFolder: function (folder) {
        currentFolder = folder || "m-tech/general";
      },
      uploadAll: async function () {
        var pending = selectedFiles.filter(function (file) { return !file.isUploaded && file.file; });
        await Promise.all(pending.map(uploadOne));
        return api.getUrls();
      },
      setFiles: function (existing) {
        selectedFiles.forEach(function (file) {
          if (file.url && file.url.indexOf("blob:") === 0) URL.revokeObjectURL(file.url);
        });

        selectedFiles = (existing || []).map(function (item, index) {
          var media = typeof item === "string"
            ? { url: item, originalUrl: item, publicId: "", resourceType: "image" }
            : item;
          remember(media);
          return {
            id: Math.random().toString(36).slice(2, 10),
            file: null,
            url: media.url,
            remoteUrl: media.originalUrl || media.url,
            optimizedUrl: media.url,
            publicId: media.publicId || "",
            resourceType: media.resourceType || "image",
            isUploaded: true,
            isMain: index === 0,
            progress: 100,
            error: null,
            abortController: null
          };
        });

        render();
        onFilesChanged(selectedFiles);
      }
    };

    Object.defineProperty(api, "folder", {
      get: function () { return currentFolder; },
      set: function (value) { currentFolder = value || currentFolder; }
    });

    return api;
  }

  window.MTECH_CLOUDINARY = {
    getConfig: getConfig,
    uploadFile: uploadFile,
    createUploader: createUploader,
    optimizedUrl: optimizedUrl,
    getMediaForUrls: function (urls) {
      return (urls || []).map(function (url) {
        return mediaIndex[url] || { url: url, publicId: "", resourceType: "image" };
      });
    },
    getKnownMedia: function (url) {
      return mediaIndex[url] || null;
    }
  };
})();
