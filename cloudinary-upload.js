/* ==========================================================================
   M-TECH Premium Gadget Store — Cloudinary Image Upload Service
   ========================================================================= */

const MTECH_CLOUDINARY = {
  // Upload a single file to Cloudinary using unsigned upload preset
  uploadFile: async (file, folder = "m-tech/general", onProgress = null) => {
    const config = MTECH_CONFIG.cloudinary;
    if (!config.cloudName || config.cloudName === "YOUR_CLOUD_NAME") {
      throw new Error("Cloudinary Cloud Name is not configured. Please edit js/firebase-config.js.");
    }
    if (!config.uploadPreset || config.uploadPreset === "YOUR_UPLOAD_PRESET") {
      throw new Error("Cloudinary Upload Preset is not configured. Please edit js/firebase-config.js.");
    }

    // File validation
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Unsupported image format. Allowed formats: JPG, JPEG, PNG, WEBP.");
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      throw new Error("This image is too large. Please choose an image smaller than 5 MB.");
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            width: response.width,
            height: response.height
          });
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error.message || "Upload failed."));
          } catch (e) {
            reject(new Error(`Upload failed with status code ${xhr.status}.`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error occurred during image upload. Check internet connection."));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("folder", folder);

      xhr.send(formData);
    });
  },

  // Drop-in uploader widget generator
  createUploader: (containerId, options = {}) => {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const folder = options.folder || "m-tech/general";
    const maxFiles = options.maxFiles || 8;
    const onFilesChanged = options.onChange || (() => {});
    
    let selectedFiles = []; // Array of objects { id, file, url, isUploaded, progress, error }

    // Render HTML structure
    container.innerHTML = `
      <div class="cloudinary-uploader" style="border: 2px dashed var(--line-strong); border-radius: var(--radius); padding: 26px; text-align: center; background: var(--off); transition: border-color 0.2s ease;">
        <input type="file" class="uploader-input" accept="image/jpeg,image/jpg,image/png,image/webp" style="display: none;" ${maxFiles > 1 ? 'multiple' : ''}>
        <div class="uploader-dropzone" style="cursor: pointer; padding: 20px 10px;">
          <div style="font-size: 2.2rem; color: var(--grey); margin-bottom: 8px;">📷</div>
          <p class="uploader-title" style="font-weight: 600; margin-bottom: 4px; font-size: 0.95rem;">Select and upload images directly from device</p>
          <p style="font-size: 0.78rem; color: var(--ink-55);">Supports JPG, JPEG, PNG, WEBP (Max 5MB per image, limit ${maxFiles})</p>
        </div>
        <div class="uploader-previews" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 14px; margin-top: 18px;"></div>
      </div>
    `;

    const dropzone = container.querySelector(".uploader-dropzone");
    const fileInput = container.querySelector(".uploader-input");
    const previewsContainer = container.querySelector(".uploader-previews");
    const uploaderBox = container.querySelector(".cloudinary-uploader");

    // Click triggers file selector
    dropzone.addEventListener("click", () => fileInput.click());

    // Drag & Drop
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploaderBox.style.borderColor = "var(--ink)";
    });

    dropzone.addEventListener("dragleave", () => {
      uploaderBox.style.borderColor = "var(--line-strong)";
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploaderBox.style.borderColor = "var(--line-strong)";
      if (e.dataTransfer.files.length) {
        addFiles(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) {
        addFiles(e.target.files);
      }
    });

    function addFiles(filesList) {
      const remainingSlots = maxFiles - selectedFiles.length;
      if (remainingSlots <= 0) {
        alert(`Maximum ${maxFiles} image(s) allowed.`);
        return;
      }

      const filesToAdd = Array.from(filesList).slice(0, remainingSlots);

      filesToAdd.forEach(file => {
        // Validate format
        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
          alert(`File "${file.name}" is not supported. Please choose JPG, PNG, or WEBP.`);
          return;
        }

        // Validate size
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" is larger than 5MB. Please compress it.`);
          return;
        }

        const id = Math.random().toString(36).substring(2, 9);
        const fileObj = {
          id: id,
          file: file,
          url: URL.createObjectURL(file), // Local preview URL
          isUploaded: false,
          isMain: selectedFiles.length === 0, // Mark first as main
          progress: 0,
          error: null,
          remoteUrl: ""
        };

        selectedFiles.push(fileObj);
      });

      renderPreviews();
      onFilesChanged(selectedFiles);
    }

    function removeFile(id) {
      const fileIndex = selectedFiles.findIndex(f => f.id === id);
      if (fileIndex > -1) {
        const wasMain = selectedFiles[fileIndex].isMain;
        
        // Revoke local preview URL to avoid memory leak
        URL.revokeObjectURL(selectedFiles[fileIndex].url);
        selectedFiles.splice(fileIndex, 1);
        
        // If we removed the main image, make the first remaining one main
        if (wasMain && selectedFiles.length > 0) {
          selectedFiles[0].isMain = true;
        }
      }
      renderPreviews();
      onFilesChanged(selectedFiles);
    }

    function setMainFile(id) {
      selectedFiles.forEach(f => {
        f.isMain = (f.id === id);
      });
      renderPreviews();
      onFilesChanged(selectedFiles);
    }

    function reorderFile(id, direction) {
      const idx = selectedFiles.findIndex(f => f.id === id);
      if (idx === -1) return;
      
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= selectedFiles.length) return;

      const temp = selectedFiles[idx];
      selectedFiles[idx] = selectedFiles[nextIdx];
      selectedFiles[nextIdx] = temp;

      renderPreviews();
      onFilesChanged(selectedFiles);
    }

    function renderPreviews() {
      previewsContainer.innerHTML = "";
      if (selectedFiles.length === 0) {
        previewsContainer.style.display = "none";
        return;
      }
      previewsContainer.style.display = "grid";

      selectedFiles.forEach((fileObj, index) => {
        const card = document.createElement("div");
        card.className = "preview-card";
        card.style.cssText = `
          position: relative; border: 1px solid var(--line); border-radius: var(--radius-sm); 
          padding: 6px; background: #fff; display: flex; flex-direction: column; align-items: center;
          box-shadow: var(--shadow-sm); transition: transform 0.15s ease;
        `;
        
        const previewUrl = fileObj.isUploaded ? fileObj.remoteUrl : fileObj.url;

        card.innerHTML = `
          <div class="preview-img-wrapper" style="width: 100%; aspect-ratio: 1/1; border-radius: var(--radius-xs); overflow: hidden; background: var(--off); position: relative;">
            <img src="${previewUrl}" style="width: 100%; height: 100%; object-fit: contain;">
            ${fileObj.isMain ? '<span style="position: absolute; bottom: 4px; left: 4px; background: var(--ink); color: #fff; font-size: 0.6rem; font-weight: 700; padding: 2px 6px; border-radius: 99px;">MAIN</span>' : ''}
            <button type="button" class="remove-btn" style="position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; cursor: pointer; display: grid; place-items: center; font-size: 0.8rem; font-weight: bold;">&times;</button>
          </div>
          
          <!-- Control Buttons -->
          <div style="display: flex; gap: 4px; width: 100%; margin-top: 6px; justify-content: center;">
            <button type="button" class="ctrl-btn main-btn" style="font-size: 0.65rem; border: 1px solid var(--line-strong); background: #fff; border-radius: 4px; padding: 2px 4px; cursor: pointer; flex: 1;" ${fileObj.isMain ? 'disabled style="opacity: 0.5;"' : ''}>Make Main</button>
            ${index > 0 ? '<button type="button" class="ctrl-btn left-btn" style="font-size: 0.65rem; border: 1px solid var(--line-strong); background: #fff; border-radius: 4px; padding: 2px 4px; cursor: pointer;">&larr;</button>' : ''}
            ${index < selectedFiles.length - 1 ? '<button type="button" class="ctrl-btn right-btn" style="font-size: 0.65rem; border: 1px solid var(--line-strong); background: #fff; border-radius: 4px; padding: 2px 4px; cursor: pointer;">&rarr;</button>' : ''}
          </div>

          <!-- Progress or Error Overlay -->
          ${fileObj.progress > 0 && !fileObj.isUploaded && !fileObj.error ? `
            <div style="position: absolute; inset: 6px; background: rgba(255,255,255,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-sm);">
              <span style="font-size: 0.72rem; font-weight: 600; color: var(--ink);">${fileObj.progress}%</span>
              <div style="width: 70%; height: 4px; background: var(--line-strong); border-radius: 99px; margin-top: 4px; overflow: hidden;">
                <div style="width: ${fileObj.progress}%; height: 100%; background: var(--wa);"></div>
              </div>
            </div>
          ` : ''}

          ${fileObj.error ? `
            <div style="position: absolute; inset: 6px; background: rgba(253,240,240,0.92); border: 1px solid #f2d4d4; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-sm); padding: 4px; text-align: center;">
              <span style="font-size: 0.65rem; color: #95271f; font-weight: 600; line-height: 1.1;">Failed</span>
              <button type="button" class="retry-btn" style="font-size: 0.6rem; background: var(--ink); color: #fff; border: none; padding: 2px 6px; border-radius: 4px; margin-top: 4px; cursor: pointer;">Retry</button>
            </div>
          ` : ''}
        `;

        // Wire Event Listeners
        card.querySelector(".remove-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          removeFile(fileObj.id);
        });

        card.querySelector(".main-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          setMainFile(fileObj.id);
        });

        const leftBtn = card.querySelector(".left-btn");
        if (leftBtn) {
          leftBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            reorderFile(fileObj.id, -1);
          });
        }

        const rightBtn = card.querySelector(".right-btn");
        if (rightBtn) {
          rightBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            reorderFile(fileObj.id, 1);
          });
        }

        const retryBtn = card.querySelector(".retry-btn");
        if (retryBtn) {
          retryBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            uploadSingleFile(fileObj);
          });
        }

        previewsContainer.appendChild(card);
      });
    }

    // Direct single file upload sequence
    async function uploadSingleFile(fileObj) {
      fileObj.error = null;
      fileObj.progress = 0;
      renderPreviews();

      try {
        const result = await MTECH_CLOUDINARY.uploadFile(fileObj.file, folder, (percent) => {
          fileObj.progress = percent;
          renderPreviews();
        });
        fileObj.isUploaded = true;
        fileObj.remoteUrl = result.url;
        renderPreviews();
        onFilesChanged(selectedFiles);
      } catch (err) {
        fileObj.error = err.message;
        renderPreviews();
        onFilesChanged(selectedFiles);
      }
    }

    // Public widget API
    return {
      getFiles: () => selectedFiles,
      getUrls: () => selectedFiles.filter(f => f.isUploaded).map(f => f.remoteUrl),
      getThumbnail: () => {
        const main = selectedFiles.find(f => f.isMain && f.isUploaded) || selectedFiles.find(f => f.isUploaded);
        return main ? main.remoteUrl : "";
      },
      hasPending: () => selectedFiles.some(f => !f.isUploaded && !f.error),
      hasErrors: () => selectedFiles.some(f => f.error !== null),
      
      // Trigger all uploads
      uploadAll: async (onDone = null) => {
        if (!MTECH_CONFIG.isEnabled) {
          // If offline mode, simulate local success
          selectedFiles.forEach(f => {
            f.isUploaded = true;
            f.remoteUrl = f.url; // mock URL
          });
          renderPreviews();
          if (onDone) onDone(selectedFiles.map(f => f.url));
          return selectedFiles.map(f => f.url);
        }

        const pending = selectedFiles.filter(f => !f.isUploaded);
        if (pending.length === 0) {
          if (onDone) onDone(selectedFiles.map(f => f.remoteUrl));
          return selectedFiles.map(f => f.remoteUrl);
        }

        let completed = 0;
        const uploadPromises = pending.map(async (fileObj) => {
          try {
            await uploadSingleFile(fileObj);
            completed++;
          } catch (e) {
            console.error("Cloudinary batch item upload error:", e);
          }
        });

        await Promise.all(uploadPromises);

        const finalUrls = selectedFiles.filter(f => f.isUploaded).map(f => f.remoteUrl);
        if (onDone) onDone(finalUrls);
        return finalUrls;
      },

      setFiles: (existingUrls) => {
        selectedFiles = existingUrls.map((url, index) => ({
          id: Math.random().toString(36).substring(2, 9),
          file: null,
          url: url,
          isUploaded: true,
          isMain: index === 0,
          progress: 100,
          error: null,
          remoteUrl: url
        }));
        renderPreviews();
        onFilesChanged(selectedFiles);
      }
    };
  }
};

// Expose the shared Cloudinary upload service for account/admin/request pages.
window.MTECH_CLOUDINARY = MTECH_CLOUDINARY;
