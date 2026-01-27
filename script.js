document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. GLOBAL VARIABLES
    // =========================================================================
    const landingView = document.getElementById('landing-view');
    const docsView = document.getElementById('docs-view');
    const projectGrid = document.getElementById('project-grid');
    const projectSelector = document.getElementById('project-selector');
    const sidebarList = document.getElementById('section-list');
    const mainContent = document.getElementById('main-content');
    const searchInput = document.getElementById('search-input');
    const homeBtn = document.getElementById('home-btn');
    const themeBtn = document.getElementById('theme-btn');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    let allProjectsIndex = [];
    let currentProjectData = null;
    let flatNavigationList = []; 

    // =========================================================================
    // 2. INITIALIZATION & LISTENERS
    // =========================================================================
    initStarfield();
    applyRandomTheme();
    fetchProjectIndex();

    if(homeBtn) homeBtn.addEventListener('click', showLandingPage);
    if(projectSelector) projectSelector.addEventListener('change', (e) => loadProjectDocumentation(e.target.value));
    if(themeBtn) themeBtn.addEventListener('click', () => { cycleTheme(); initStarfield(); });
    
    // Search Listener
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            // If empty, restore tree. If query, flatten results.
            if(!query) initSidebar(currentProjectData.sections); 
            else filterSidebar(query);
        });
    }

    if(lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if(lightbox) lightbox.addEventListener('click', (e) => { if(e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) closeLightbox(); });

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => { img.classList.remove('lazy'); img.classList.add('loaded'); img.removeAttribute('min-height'); };
                observer.unobserve(img);
            }
        });
    }, { rootMargin: "200px" });

    // =========================================================================
    // 3. CORE LOGIC
    // =========================================================================

    function fetchProjectIndex() {
        fetch('data.json').then(res => res.json()).then(projects => {
            allProjectsIndex = projects;
            renderLandingPage(projects);
            populateDropdown(projects);
        }).catch(err => {
            console.error("Error loading data.json:", err);
            projectGrid.innerHTML = '<p style="color:white;text-align:center;">Error loading data.json</p>';
        });
    }

    function renderLandingPage(projects) {
        projectGrid.innerHTML = '';
        projects.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <img src="${proj.image}" class="card-image" alt="${proj.title}">
                <div class="card-content">
                    <h3>${proj.title}</h3>
                    <p>${proj.description}</p>
                </div>`;
            card.addEventListener('click', () => loadProjectDocumentation(proj.path));
            projectGrid.appendChild(card);
        });
    }

    function populateDropdown(projects) {
        projectSelector.innerHTML = '<option value="" disabled selected>Switch Project...</option>';
        projects.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.path;
            option.textContent = proj.title;
            projectSelector.appendChild(option);
        });
    }

    // RECURSIVE FLATTENER (Builds reading order: Parent -> Child -> Next Parent)
    function buildLinearList(sections, list = []) {
        sections.forEach(section => {
            if (!section._uuid) section._uuid = Math.random().toString(36).substr(2, 9);
            list.push(section);
            if (section.subsections && section.subsections.length > 0) {
                buildLinearList(section.subsections, list);
            }
        });
        return list;
    }

    function loadProjectDocumentation(jsonPath) {
        mainContent.innerHTML = '<div class="placeholder"><p>Loading...</p></div>';
        if(projectSelector) projectSelector.value = jsonPath;

        fetch(jsonPath)
            .then(res => res.json())
            .then(projectData => {
                currentProjectData = projectData;
                flatNavigationList = buildLinearList(projectData.sections); // Prepare Nav
                showDocsInterface();
                initSidebar(projectData.sections);
                if(searchInput) searchInput.value = ''; 
            })
            .catch(err => {
                console.error("Error:", err);
                mainContent.innerHTML = `<div class="placeholder"><p>Error loading ${jsonPath}</p></div>`;
            });
    }

    // =========================================================================
    // 4. RECURSIVE SIDEBAR LOGIC
    // =========================================================================

    function initSidebar(sectionsToRender) {
        sidebarList.innerHTML = ''; 
        if(!sectionsToRender || sectionsToRender.length === 0) {
            sidebarList.innerHTML = '<li class="no-results">No sections found</li>';
            return;
        }

        // Helper to recursively build tree items
        const createSidebarItem = (section) => {
            const li = document.createElement('li');
            li.dataset.id = section._uuid;

            // Header (Title + Arrow)
            const header = document.createElement('div');
            header.className = 'sidebar-item-header';
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = section.title;
            header.appendChild(titleSpan);

            // Click Interaction
            header.addEventListener('click', (e) => {
                highlightSidebarItem(section._uuid);
                renderContent(section);
            });

            // Recursive Children
            if (section.subsections && section.subsections.length > 0) {
                // Arrow Icon
                const arrow = document.createElement('i');
                arrow.className = 'bx bx-chevron-right arrow-icon';
                header.appendChild(arrow);
                
                // Toggle Collapse (Stop prop so we don't trigger page load)
                arrow.addEventListener('click', (e) => { 
                    e.stopPropagation(); 
                    li.classList.toggle('open'); 
                });

                // Container for children
                const subUl = document.createElement('ul');
                subUl.className = 'sidebar-sublist';

                // Recurse
                section.subsections.forEach(sub => {
                    subUl.appendChild(createSidebarItem(sub));
                });

                li.appendChild(header);
                li.appendChild(subUl);
            } else {
                li.appendChild(header);
            }

            return li;
        };

        // Render Roots
        sectionsToRender.forEach(sec => {
            sidebarList.appendChild(createSidebarItem(sec));
        });

        // Auto-load first item on fresh load
        if ((!searchInput || !searchInput.value) && flatNavigationList.length > 0) {
            const first = flatNavigationList[0];
            highlightSidebarItem(first._uuid);
            renderContent(first);
        }
    }

    // UPDATED: Expands parents automatically
    function highlightSidebarItem(uuid) {
        // 1. Remove active from everyone
        document.querySelectorAll('#section-list li, .sidebar-sublist li').forEach(el => {
            el.classList.remove('active', 'sub-active');
        });
        
        // 2. Find target
        const target = document.querySelector(`li[data-id="${uuid}"]`);
        if (target) {
            target.classList.add('active');
            // If inside a sublist, mark as sub-active
            if (target.parentElement.classList.contains('sidebar-sublist')) {
                target.classList.add('sub-active');
            }

            // 3. Walk up the DOM to open all parent ULs
            let parent = target.parentElement;
            while(parent && parent.id !== 'section-list') {
                if(parent.classList.contains('sidebar-sublist')) {
                    // The LI wrapping this UL needs 'open' class
                    const parentLi = parent.parentElement;
                    if(parentLi && parentLi.tagName === 'LI') {
                        parentLi.classList.add('open');
                    }
                }
                parent = parent.parentElement;
            }

            // 4. Scroll into view
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100); // Small delay to allow CSS transitions to start opening
        }
    }

    // Flattened Search (Non-recursive display for results)
    function filterSidebar(query) {
        if (!currentProjectData) return;
        const results = [];
        const traverse = (list, parentChain = '') => {
            list.forEach(sec => {
                const fullName = parentChain ? `${parentChain} > ${sec.title}` : sec.title;
                if(matchesQuery(sec, query)) {
                    // Create visual copy (flat)
                    results.push({ ...sec, title: fullName, subsections: null });
                }
                if(sec.subsections) traverse(sec.subsections, fullName);
            });
        };
        traverse(currentProjectData.sections);
        initSidebar(results);
    }

    function matchesQuery(section, query) {
        if (section.title.toLowerCase().includes(query)) return true;
        return section.content.some(block => {
            if (block.value && typeof block.value === 'string') return block.value.toLowerCase().includes(query);
            if (block.value && Array.isArray(block.value)) return block.value.join(' ').toLowerCase().includes(query);
            return false;
        });
    }

    // =========================================================================
    // 5. CONTENT RENDERING
    // =========================================================================

    function renderContent(section) {
        mainContent.innerHTML = '';

        // Title
        const title = document.createElement('h1');
        title.className = 'doc-title';
        title.textContent = section.title;
        mainContent.appendChild(title);

        // Render Blocks
        if (section.content) {
            section.content.forEach(block => {
                let el;
                // Text/HTML
                if (block.type === 'header') { el = document.createElement('h2'); el.innerHTML = block.value; } 
                else if (block.type === 'text') { el = document.createElement('div'); el.className = 'text-block'; el.innerHTML = parseRichText(block.value); } 
                else if (block.type === 'note') { el = document.createElement('div'); el.className = 'note-block'; el.innerHTML = `<i class='bx bx-info-circle'></i> <div>${parseRichText(block.value)}</div>`; }
                else if (block.type === 'tip') { el = document.createElement('div'); el.className = 'tip-block'; el.innerHTML = `<i class='bx bx-bulb'></i> <div>${parseRichText(block.value)}</div>`; }
                else if (block.type === 'code') { el = document.createElement('pre'); el.className = 'code-block'; el.textContent = Array.isArray(block.value) ? block.value.join('\n') : block.value; }
                
                // Images
                else if (block.type === 'image') {
                    const wrap = document.createElement('div'); wrap.className = `img-wrap ${block.align}`;
                    const img = document.createElement('img'); img.dataset.src = block.src; img.className = 'lazy'; img.alt = block.caption || "Doc Image"; img.style.cursor = 'zoom-in';
                    img.addEventListener('click', () => openLightbox(block.src)); imageObserver.observe(img);
                    wrap.appendChild(img);
                    if(block.caption) { const cap = document.createElement('span'); cap.className = 'caption'; cap.textContent = block.caption; wrap.appendChild(cap); }
                    el = wrap;
                }
                // Roadmap
                else if (block.type === 'roadmap') {
                     const container = document.createElement('div'); container.className = 'roadmap-container';
                     block.milestones.forEach(milestone => {
                        const item = document.createElement('div');
                        const statusClass = `status-${milestone.status.toLowerCase().replace(' ', '-')}`;
                        item.className = `roadmap-item ${statusClass}`;
                        const featureList = milestone.features.map(f => `<li>${f}</li>`).join('');
                        item.innerHTML = `
                            <div class="roadmap-content">
                                <div class="roadmap-header-group">
                                    <div class="rm-meta"><span class="rm-version">${milestone.version}</span><span class="rm-date">${milestone.date}</span></div>
                                    <i class='bx bx-chevron-down rm-toggle-icon'></i>
                                </div>
                                <div class="roadmap-details"><ul class="rm-features">${featureList}</ul></div>
                            </div>`;
                        item.querySelector('.roadmap-header-group').addEventListener('click', () => { item.classList.toggle('expanded'); });
                        container.appendChild(item);
                     });
                     el = container;
                }
                if (el) mainContent.appendChild(el);
            });
        }

        // Subsection Grid (Quick Links)
        if (section.subsections && section.subsections.length > 0) {
            const subContainer = document.createElement('div');
            subContainer.className = 'subsection-grid';
            section.subsections.forEach(sub => {
                const card = document.createElement('div');
                card.className = 'subsection-card';
                card.innerHTML = `<i class='bx bx-subdirectory-right'></i><span>${sub.title}</span>`;
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    highlightSidebarItem(sub._uuid);
                    renderContent(sub);
                });
                subContainer.appendChild(card);
            });
            mainContent.appendChild(subContainer);
        }
        
        // Navigation Buttons (Prev/Next in Flattened List)
        if (!searchInput || !searchInput.value) renderNavButtons(section);

        const clear = document.createElement('div');
        clear.style.clear = 'both';
        mainContent.appendChild(clear);
        mainContent.scrollTop = 0;
    }

    function renderNavButtons(currentSection) {
        const flatIndex = flatNavigationList.findIndex(item => item._uuid === currentSection._uuid);
        if (flatIndex === -1) return;

        const navContainer = document.createElement('div');
        navContainer.className = 'page-nav';

        if (flatIndex > 0) {
            const prev = flatNavigationList[flatIndex - 1];
            const btn = document.createElement('div'); btn.className = 'nav-btn prev';
            btn.innerHTML = `<i class='bx bx-chevron-left'></i><div><span class="nav-label">Previous</span><span class="nav-title">${prev.title}</span></div>`;
            btn.addEventListener('click', () => { highlightSidebarItem(prev._uuid); renderContent(prev); });
            navContainer.appendChild(btn);
        }
        if (flatIndex < flatNavigationList.length - 1) {
            const next = flatNavigationList[flatIndex + 1];
            const btn = document.createElement('div'); btn.className = 'nav-btn next';
            btn.innerHTML = `<div><span class="nav-label">Next</span><span class="nav-title">${next.title}</span></div><i class='bx bx-chevron-right'></i>`;
            btn.addEventListener('click', () => { highlightSidebarItem(next._uuid); renderContent(next); });
            navContainer.appendChild(btn);
        }
        mainContent.appendChild(navContainer);
    }

    function parseRichText(content) {
        if (Array.isArray(content)) return content.join("");
        return content;
    }

    // View Switching & Utils
    function showDocsInterface() { landingView.classList.add('hidden'); docsView.classList.remove('hidden'); }
    function showLandingPage() { docsView.classList.add('hidden'); landingView.classList.remove('hidden'); if(projectSelector) projectSelector.value = ""; }
    function openLightbox(src) { if(lightboxImg) lightboxImg.src = src; if(lightbox) lightbox.classList.add('active'); }
    function closeLightbox() { if(lightbox) lightbox.classList.remove('active'); setTimeout(() => { if(lightboxImg) lightboxImg.src = ''; }, 300); }

});

// Visuals
function cycleTheme() {
    const themes = ['theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal'];
    const body = document.body;
    let current = '';
    themes.forEach(t => { if(body.classList.contains(t)) current = t; });
    body.classList.remove(...themes);
    if (!current) body.classList.add(themes[0]);
    else { const idx = themes.indexOf(current); if (idx + 1 < themes.length) body.classList.add(themes[idx + 1]); }
}

function applyRandomTheme() {
    const themes = ['theme-default', 'theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    // Clean up old classes before adding new ones
    document.body.classList.remove('theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal', 'dark-theme');
    
    if (randomTheme !== 'theme-default') {
        document.body.classList.add(randomTheme, 'dark-theme');
    }
}

function initStarfield() {
    var canvas = document.getElementById('canvas'); if(!canvas) return;
    var ctx = canvas.getContext('2d'), w = canvas.width = window.innerWidth, h = canvas.height = window.innerHeight;
    const bodyStyle = getComputedStyle(document.body);
    const themeHue = bodyStyle.getPropertyValue('--first-color-hue').trim();
    var hue = parseInt(themeHue) || 35; 
    var stars = [], count = 0, maxStars = 400;
    var canvas2 = document.createElement('canvas'), ctx2 = canvas2.getContext('2d');
    canvas2.width = 100; canvas2.height = 100;
    var half = canvas2.width / 2, gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
    gradient2.addColorStop(0.025, 'hsla(' + hue + ', 99%, 99%, 100%)'); gradient2.addColorStop(0.1, 'hsla(' + hue + ', 99%, 63%, 60%)'); gradient2.addColorStop(0.25, 'hsla(' + hue + ', 64%, 55%, 0%)');
    ctx2.fillStyle = gradient2; ctx2.beginPath(); ctx2.arc(half, half, half, 0, Math.PI * 2); ctx2.fill();
    function random(min, max) { if (arguments.length < 2) { max = min; min = 0; } if (min > max) { var hold = max; max = min; min = hold; } return Math.floor(Math.random() * (max - min + 1)) + min; }
    function maxOrbit(x, y) { var max = Math.max(x, y), diameter = Math.round(Math.sqrt(max * max + max * max)); return diameter / 2; }
    var Star = function () { this.orbitRadius = random(maxOrbit(w, h)); this.radius = random(60, this.orbitRadius) / 12; this.orbitX = w / 2; this.orbitY = h / 2; this.timePassed = random(0, maxStars); this.speed = random(this.orbitRadius) / 500000; this.alpha = random(2, 10) / 10; count++; stars[count] = this; }
    Star.prototype.draw = function () { var x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX, y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY, twinkle = random(10); if (twinkle === 1 && this.alpha > 0) this.alpha -= 0.05; else if (twinkle === 2 && this.alpha < 1) this.alpha += 0.05; ctx.globalAlpha = this.alpha; ctx.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius); this.timePassed += this.speed; }
    if(window.starLoop) cancelAnimationFrame(window.starLoop);
    stars = []; count = 0; for (var i = 0; i < maxStars; i++) new Star();
    function animation() { ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'; for (var i = 1, l = stars.length; i < l; i++) stars[i].draw(); ctx.globalCompositeOperation = 'source-over'; window.starLoop = requestAnimationFrame(animation); }
    animation();
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });
}