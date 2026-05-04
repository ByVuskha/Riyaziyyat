/**
 * Image Upload & Compression Utility
 * Şəkilləri kiçildir və base64-ə çevirir
 */

const ImageUploader = {
    // Maksimum ölçülər
    MAX_WIDTH: 400,
    MAX_HEIGHT: 400,
    QUALITY: 0.7, // 70% keyfiyyət
    MAX_SIZE_KB: 100, // 100KB maksimum

    /**
     * Şəkil seç və kiçilt
     * @param {File} file - Şəkil faylı
     * @returns {Promise<string>} - Base64 string
     */
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            // Fayl növünü yoxla
            if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
                reject('Yalnız JPG, PNG və WebP formatları dəstəklənir');
                return;
            }

            // Fayl ölçüsünü yoxla (5MB-dan böyük olmasın)
            if (file.size > 5 * 1024 * 1024) {
                reject('Şəkil 5MB-dan böyük ola bilməz');
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // Canvas yarat
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Ölçüləri hesabla (aspect ratio saxla)
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > this.MAX_WIDTH) {
                            height = (height * this.MAX_WIDTH) / width;
                            width = this.MAX_WIDTH;
                        }
                    } else {
                        if (height > this.MAX_HEIGHT) {
                            width = (width * this.MAX_HEIGHT) / height;
                            height = this.MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Şəkli çək
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Base64-ə çevir
                    let quality = this.QUALITY;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // Ölçü çox böyükdürsə, keyfiyyəti azalt
                    while (this.getBase64Size(dataUrl) > this.MAX_SIZE_KB && quality > 0.1) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    
                    const sizeKB = this.getBase64Size(dataUrl);
                    console.log(`✅ Şəkil kiçildildi: ${sizeKB}KB (keyfiyyət: ${Math.round(quality * 100)}%)`);
                    
                    resolve(dataUrl);
                };
                
                img.onerror = () => reject('Şəkil yüklənə bilmədi');
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject('Fayl oxuna bilmədi');
            reader.readAsDataURL(file);
        });
    },

    /**
     * Base64 string-in ölçüsünü hesabla (KB)
     */
    getBase64Size(base64String) {
        const stringLength = base64String.length - 'data:image/jpeg;base64,'.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
        return Math.round(sizeInBytes / 1024);
    },

    /**
     * Input element yaradır və şəkil seçməyə imkan verir
     */
    async selectAndCompress() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject('Fayl seçilmədi');
                    return;
                }
                
                try {
                    const compressed = await this.compressImage(file);
                    resolve(compressed);
                } catch (error) {
                    reject(error);
                }
            };
            
            input.click();
        });
    },

    /**
     * Şəkil preview göstərir
     */
    showPreview(base64String, targetElement) {
        if (typeof targetElement === 'string') {
            targetElement = document.getElementById(targetElement);
        }
        
        if (!targetElement) {
            console.error('Preview element tapılmadı');
            return;
        }
        
        targetElement.innerHTML = `
            <img src="${base64String}" 
                 style="max-width:100%;max-height:200px;border-radius:10px;object-fit:cover;" 
                 alt="Preview">
        `;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageUploader;
}
