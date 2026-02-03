// assets/js/core/loader.js
class LoaderManager {
    constructor() {
        this.loaders = new Map();
        this.submittingForms = new Set();
        this.defaultLoaderId = 'global-loader';
        
        this.init();
    }
    
    init() {
        this.createGlobalLoader();
        this.setupFormInterceptors();
        this.setupButtonInterceptors();
    }
    
    createGlobalLoader() {
        // Check if loader already exists
        if (document.getElementById(this.defaultLoaderId)) {
            return;
        }
        
        const loader = document.createElement('div');
        loader.id = this.defaultLoaderId;
        loader.className = 'global-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease;
        `;
        
        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner">
                    <div class="spinner-inner"></div>
                </div>
                <p class="loader-text">Loading...</p>
            </div>
            
            <style>
                .spinner {
                    width: 60px;
                    height: 60px;
                    position: relative;
                    margin: 0 auto 20px;
                }
                
                .spinner-inner {
                    box-sizing: border-box;
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border: 6px solid transparent;
                    border-top-color: #4361ee;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                .spinner-inner::after {
                    content: '';
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    right: 6px;
                    bottom: 6px;
                    border: 6px solid transparent;
                    border-top-color: #3a56d4;
                    border-radius: 50%;
                    animation: spin 0.5s linear infinite reverse;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .loader-text {
                    text-align: center;
                    font-size: 16px;
                    color: #4361ee;
                    font-weight: 600;
                    margin: 0;
                }
                
                .loader-content {
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    border: 1px solid #e5e7eb;
                }
            </style>
        `;
        
        document.body.appendChild(loader);
        this.loaders.set(this.defaultLoaderId, loader);
    }
    
    setupFormInterceptors() {
        document.addEventListener('submit', async (e) => {
            const form = e.target;
            
            // Skip if already submitting
            if (this.submittingForms.has(form)) {
                e.preventDefault();
                return;
            }
            
            // Check if form has data-loader attribute
            const loaderType = form.dataset.loader || 'global';
            
            // Skip forms that don't need loader
            if (form.dataset.noLoader === 'true') {
                return;
            }
            
            // Mark form as submitting
            this.submittingForms.add(form);
            
            // Show loader
            await this.showLoader(form, loaderType);
            
            // Set timeout to handle stuck forms
            const timeout = setTimeout(() => {
                if (this.submittingForms.has(form)) {
                    console.warn('Form submission taking too long:', form.id || form.name);
                    this.hideLoader(form, loaderType);
                    this.submittingForms.delete(form);
                }
            }, 30000); // 30 seconds timeout
            
            // Store timeout for cleanup
            form._loaderTimeout = timeout;
            
            // Listen for form completion
            form.addEventListener('form-complete', () => {
                this.handleFormComplete(form, loaderType);
            });
        });
    }
    
    setupButtonInterceptors() {
        document.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            // Check for data-loader attribute
            if (button.dataset.loader) {
                e.preventDefault();
                
                // Skip if already loading
                if (button.classList.contains('loading')) {
                    return;
                }
                
                const loaderType = button.dataset.loader;
                const action = button.dataset.action || button.onclick || button.getAttribute('onclick');
                
                await this.showLoader(button, loaderType);
                
                try {
                    // Execute the action
                    if (action) {
                        if (typeof action === 'function') {
                            await action.call(button, e);
                        } else if (typeof window[action] === 'function') {
                            await window[action].call(button, e);
                        }
                    }
                } finally {
                    this.hideLoader(button, loaderType);
                }
            }
        });
    }
    
    async showLoader(element, type = 'global', message = '') {
        switch (type) {
            case 'global':
                await this.showGlobalLoader(message);
                break;
                
            case 'inline':
                this.showInlineLoader(element, message);
                break;
                
            case 'button':
                this.showButtonLoader(element, message);
                break;
                
            case 'custom':
                // Custom loader logic
                break;
        }
    }
    
    async hideLoader(element, type = 'global') {
        switch (type) {
            case 'global':
                this.hideGlobalLoader();
                break;
                
            case 'inline':
                this.hideInlineLoader(element);
                break;
                
            case 'button':
                this.hideButtonLoader(element);
                break;
        }
        
        // Clean up form timeout
        if (element._loaderTimeout) {
            clearTimeout(element._loaderTimeout);
            delete element._loaderTimeout;
        }
        
        // Remove form from submitting set
        if (this.submittingForms.has(element)) {
            this.submittingForms.delete(element);
        }
    }
    
    async showGlobalLoader(message = '') {
        const loader = document.getElementById(this.defaultLoaderId);
        if (!loader) return;
        
        // Update message if provided
        if (message) {
            const textElement = loader.querySelector('.loader-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
        
        // Show loader with fade-in
        loader.style.display = 'flex';
        loader.style.opacity = '0';
        
        await new Promise(resolve => setTimeout(resolve, 10));
        loader.style.opacity = '1';
    }
    
    hideGlobalLoader() {
        const loader = document.getElementById(this.defaultLoaderId);
        if (!loader) return;
        
        loader.style.opacity = '0';
        
        setTimeout(() => {
            loader.style.display = 'none';
            
            // Reset message
            const textElement = loader.querySelector('.loader-text');
            if (textElement) {
                textElement.textContent = 'Loading...';
            }
        }, 300);
    }
    
    showInlineLoader(element, message = '') {
        // Create loader element
        const loader = document.createElement('div');
        loader.className = 'inline-loader';
        loader.innerHTML = `
            <div class="spinner-small"></div>
            ${message ? `<span class="loader-message">${message}</span>` : ''}
        `;
        
        // Store original content
        element._originalHTML = element.innerHTML;
        element._originalDisplay = element.style.display;
        
        // Replace content with loader
        element.innerHTML = '';
        element.appendChild(loader);
        element.classList.add('loading');
        
        // Add styles if not already present
        this.addInlineLoaderStyles();
    }
    
    hideInlineLoader(element) {
        if (!element._originalHTML) return;
        
        element.classList.remove('loading');
        element.innerHTML = element._originalHTML;
        
        if (element._originalDisplay) {
            element.style.display = element._originalDisplay;
        }
        
        delete element._originalHTML;
        delete element._originalDisplay;
    }
    
    showButtonLoader(button, message = '') {
        // Store original content and state
        button._originalHTML = button.innerHTML;
        button._originalText = button.textContent;
        button._originalWidth = button.offsetWidth + 'px';
        button._originalDisabled = button.disabled;
        
        // Set fixed width to prevent button resizing
        button.style.width = button._originalWidth;
        button.style.minWidth = button._originalWidth;
        
        // Create loader content
        button.innerHTML = `
            <span class="button-loader">
                <span class="button-spinner"></span>
                ${message || button._originalText}
            </span>
        `;
        
        button.disabled = true;
        button.classList.add('loading');
        
        // Add button loader styles
        this.addButtonLoaderStyles();
    }
    
    hideButtonLoader(button) {
        if (!button._originalHTML) return;
        
        button.classList.remove('loading');
        button.innerHTML = button._originalHTML;
        button.disabled = button._originalDisabled;
        
        // Reset styles
        button.style.width = '';
        button.style.minWidth = '';
        
        delete button._originalHTML;
        delete button._originalText;
        delete button._originalWidth;
        delete button._originalDisabled;
    }
    
    addInlineLoaderStyles() {
        if (document.getElementById('inline-loader-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'inline-loader-styles';
        style.textContent = `
            .inline-loader {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 10px;
            }
            
            .spinner-small {
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #4361ee;
                border-radius: 50%;
                animation: spin-small 1s linear infinite;
            }
            
            .loader-message {
                font-size: 14px;
                color: #4361ee;
            }
            
            @keyframes spin-small {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    addButtonLoaderStyles() {
        if (document.getElementById('button-loader-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'button-loader-styles';
        style.textContent = `
            .button-loader {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .button-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: button-spin 1s linear infinite;
            }
            
            button.loading .button-spinner {
                display: inline-block;
            }
            
            @keyframes button-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    handleFormComplete(form, loaderType) {
        this.hideLoader(form, loaderType);
        
        // Clear timeout
        if (form._loaderTimeout) {
            clearTimeout(form._loaderTimeout);
            delete form._loaderTimeout;
        }
    }
    
    // Public API methods
    show(message = '', type = 'global') {
        return this.showLoader(null, type, message);
    }
    
    hide(type = 'global') {
        return this.hideLoader(null, type);
    }
    
    async withLoader(callback, message = '', type = 'global') {
        try {
            await this.show(message, type);
            const result = await callback();
            return result;
        } finally {
            await this.hide(type);
        }
    }
    
    // Form helper methods
    disableForm(form) {
        const elements = form.elements;
        for (let i = 0; i < elements.length; i++) {
            elements[i].disabled = true;
        }
        form.classList.add('disabled');
    }
    
    enableForm(form) {
        const elements = form.elements;
        for (let i = 0; i < elements.length; i++) {
            elements[i].disabled = false;
        }
        form.classList.remove('disabled');
    }
    
    // Progress loader (for file uploads, etc.)
    createProgressLoader(id, message = '') {
        const loader = document.createElement('div');
        loader.id = `progress-loader-${id}`;
        loader.className = 'progress-loader';
        loader.innerHTML = `
            <div class="progress-header">
                <span class="progress-message">${message}</span>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(loader);
        
        // Add styles if not present
        this.addProgressLoaderStyles();
        
        return {
            update: (percentage) => this.updateProgress(id, percentage),
            remove: () => this.removeProgressLoader(id)
        };
    }
    
    updateProgress(id, percentage) {
        const loader = document.getElementById(`progress-loader-${id}`);
        if (!loader) return;
        
        const fill = loader.querySelector('.progress-fill');
        const percentageText = loader.querySelector('.progress-percentage');
        
        if (fill) {
            fill.style.width = `${percentage}%`;
        }
        
        if (percentageText) {
            percentageText.textContent = `${Math.round(percentage)}%`;
        }
    }
    
    removeProgressLoader(id) {
        const loader = document.getElementById(`progress-loader-${id}`);
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
    }
    
    addProgressLoaderStyles() {
        if (document.getElementById('progress-loader-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'progress-loader-styles';
        style.textContent = `
            .progress-loader {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                border: 1px solid #e5e7eb;
                z-index: 10000;
                transition: opacity 0.3s ease;
            }
            
            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .progress-message {
                font-weight: 500;
                color: #374151;
            }
            
            .progress-percentage {
                font-weight: 600;
                color: #4361ee;
            }
            
            .progress-bar {
                height: 8px;
                background: #f3f4f6;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4361ee, #3a56d4);
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 4px;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Initialize loader manager
if (typeof window !== 'undefined') {
    window.loaderManager = new LoaderManager();
    
    // Global helper functions
    window.showLoader = (message = '', type = 'global') => 
        window.loaderManager?.show(message, type);
    
    window.hideLoader = (type = 'global') => 
        window.loaderManager?.hide(type);
    
    window.withLoader = async (callback, message = '', type = 'global') => 
        window.loaderManager?.withLoader(callback, message, type);
}

export default LoaderManager;
