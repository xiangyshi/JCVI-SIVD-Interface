/**
 * Component Loader System for SIVD Interface
 * Loads reusable HTML components and manages navigation states
 */

class ComponentLoader {
    constructor() {
        this.basePath = this.detectBasePath();
        this.currentPage = this.detectCurrentPage();
        console.log('Base path detected:', this.basePath); // Debug log
        console.log('Current page detected:', this.currentPage); // Debug log
    }

    /**
     * Detect the base path for component loading based on current location
     */
    detectBasePath() {
        const path = window.location.pathname;
        console.log('Current path:', path); // Debug log
        
        // Check if we're in the tools directory
        if (path.includes('/tools/')) {
            return '../components/';
        }
        
        // Check if we're in the zqjd77 directory (main directory)
        if (path.includes('/zqjd77/') || path.endsWith('/zqjd77')) {
            return './components/';
        }
        
        // Default fallback
        return 'components/';
    }

    /**
     * Detect current page for navigation highlighting
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        if (path.includes('/colabfold.html')) return 'colabfold';
        if (path.includes('/proteinmpnn.html')) return 'proteinmpnn';
        if (path.includes('/foldseek.html')) return 'foldseek';
        if (path.includes('/colabdock.html')) return 'colabdock';
    
        if (filename === 'jobs.html') return 'jobs';
        
        return 'home';
    }

    /**
     * Load a component from file and insert into target element
     */
    async loadComponent(componentName, targetSelector) {
        try {
            const response = await fetch(`${this.basePath}${componentName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentName}`);
            }
            
            const html = await response.text();
            const targetElement = document.querySelector(targetSelector);
            
            if (targetElement) {
                targetElement.innerHTML = html;
                
                // Apply component-specific configurations
                if (componentName === 'navbar') {
                    this.configureNavbar();
                } else if (componentName === 'sidebar') {
                    this.configureSidebar();
                }
            } else {
                console.warn(`Target element not found: ${targetSelector}`);
            }
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
        }
    }

    /**
     * Configure navbar links and active states
     */
    configureNavbar() {
        const navLinks = document.querySelectorAll('[data-nav]');
        const urlMap = this.getUrlMap();
        
        navLinks.forEach(link => {
            const navType = link.getAttribute('data-nav');
            
            // Set href based on current location
            if (navType === 'home') {
                link.href = urlMap.home;
            } else if (navType === 'jobs') {
                link.href = urlMap.jobs;
            } else {
                link.href = urlMap.colabfold; // Keep as placeholder for future implementation
            }
            
            // Set active state
            if ((navType === 'home' && this.currentPage === 'home') ||
                (navType === 'jobs' && this.currentPage === 'jobs') ||
                (navType === 'tools' && this.currentPage !== 'home' && this.currentPage !== 'jobs')) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Configure sidebar links and active states
     */
    configureSidebar() {
        const sidebarLinks = document.querySelectorAll('[data-sidebar]');
        const urlMap = this.getUrlMap();
        
        sidebarLinks.forEach(link => {
            const sidebarType = link.getAttribute('data-sidebar');
            
            // Set href based on sidebar type
            if (urlMap[sidebarType]) {
                link.href = urlMap[sidebarType];
            }
            
            // Set active state
            if (sidebarType === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Get URL mappings based on current page location
     */
    getUrlMap() {
        const isInToolsDir = window.location.pathname.includes('/tools/');
        
        if (isInToolsDir) {
            return {
                home: '../index.html',
                jobs: '../jobs.html',
                colabfold: './colabfold.html',
                proteinmpnn: './proteinmpnn.html',
                foldseek: './foldseek.html',
                colabdock: './colabdock.html',
            };
        } else {
            return {
                home: 'index.html',
                jobs: 'jobs.html',
                colabfold: './tools/colabfold.html',
                proteinmpnn: './tools/proteinmpnn.html',
                foldseek: './tools/foldseek.html',
                colabdock: './tools/colabdock.html',
            };
        }
    }

    /**
     * Load all components for the current page
     */
    async loadAllComponents() {
        const loadPromises = [
            this.loadComponent('header', '#header-container'),
            this.loadComponent('navbar', '#navbar-container'),
            this.loadComponent('sidebar', '#sidebar-container')
        ];

        try {
            await Promise.all(loadPromises);
            console.log('All components loaded successfully');
        } catch (error) {
            console.error('Error loading components:', error);
        }
    }
}

/**
 * Initialize component loader when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async function() {
    const loader = new ComponentLoader();
    await loader.loadAllComponents();
});

/**
 * Fallback initialization for pages that don't trigger DOMContentLoaded
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async function() {
        const loader = new ComponentLoader();
        await loader.loadAllComponents();
    });
} else {
    // DOM is already ready
    const loader = new ComponentLoader();
    loader.loadAllComponents();
}