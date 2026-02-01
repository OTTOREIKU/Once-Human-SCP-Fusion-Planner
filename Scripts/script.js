let deviations = [];
let traits = [];
let techniquesData = []; 
let shopsData = []; 
let shopDeviationNames = new Set(); 
let shopDeviationArena = {}; 

let currentCategoryFilter = 'All';
let currentDeviantTypeFilter = 'All';
let currentShopFilter = 'All';
let userSelectedTraits = []; 
let isListExpanded = false; 
let allUniqueTechniques = [];

const sourceSelect = document.getElementById('sourceDev');
const builderDevSelect = document.getElementById('builderDevSelect');
const techniqueSelect = document.getElementById('targetTechnique');
const searchTechniqueSelect = document.getElementById('searchTechniqueSelect');
const tooltip = document.getElementById('technique-tooltip');

function safeTooltip(str) {
    if (!str) return "No description";
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
}

async function init() {
    try {
        let devRes;
        try {
            devRes = await fetch('Databases/deviations.json');
            if (!devRes.ok) throw new Error("Not found");
        } catch (e) {
            console.warn("Databases/deviations.json not found, falling back to Databases/data.json");
            devRes = await fetch('Databases/data.json');
        }

        const [traitRes, techRes, shopRes] = await Promise.all([
            fetch('Databases/traits.json?v=' + Date.now()),
            fetch('Databases/techniques.json'),
            fetch('Databases/shops.json')
        ]);

        if (devRes.ok) {
            deviations = await devRes.json();
            deviations.sort((a,b) => a.name.localeCompare(b.name));
        }
        if (traitRes.ok) {
            traits = await traitRes.json();
        }
        if (techRes.ok) {
            techniquesData = await techRes.json();
        }
        if (shopRes.ok) {
            shopsData = await shopRes.json();
            shopsData.forEach(arena => {
                arena.items.forEach(item => {
                    if (item.type === "Species Code") {
                        shopDeviationNames.add(item.name);
                        shopDeviationArena[item.name] = arena.arena; 
                    }
                });
            });
        }

        populateUI();
        renderDeviants(); 
        auditData(); 
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function filterTraitDropdown() {
    const input = document.getElementById('traitInput');
    const dropdown = document.getElementById('traitDropdown');
    const filter = input.value.toUpperCase();
    
    dropdown.innerHTML = "";
    
    if (filter.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    const matches = traits.filter(t => t.name.toUpperCase().includes(filter));
    
    if (matches.length > 0) {
        dropdown.style.display = 'block';
        matches.slice(0, 10).forEach(t => {
            const div = document.createElement('div');
            div.className = 'trait-option';
            div.innerHTML = `${t.name} <span>[${t.source}]</span>`;
            div.onclick = () => selectTraitFromDropdown(t.name, t.source);
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = 'none';
    }
}

function selectTraitFromDropdown(name, source) {
    const input = document.getElementById('traitInput');
    input.value = `${name} [${source}]`;
    document.getElementById('traitDropdown').style.display = 'none';
}

function toggleArenaShops() { 
    document.getElementById('arenaShops').classList.toggle('hidden'); 
    document.getElementById('btnArenaShops').classList.toggle('active');
}

function toggleTechniquesLibrary() { 
    document.getElementById('techniquesLibrary').classList.toggle('hidden'); 
    document.getElementById('btnTechniquesLib').classList.toggle('active');
}

function toggleLibrary() { 
    document.getElementById('traitsLibrary').classList.toggle('hidden'); 
    document.getElementById('btnLib').classList.toggle('active');
}

function applyShopFilter(filter, btn) {
    currentShopFilter = filter;
    document.querySelectorAll('#shop-filters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildArenaShops();
}

function buildArenaShops() { 
    const searchText = document.getElementById('searchArenaShop').value.toUpperCase();
    
    document.getElementById('arenaShopsContainer').innerHTML = shopsData.map(shop => {
        const filteredItems = shop.items.filter(i => {
            const matchesType = (currentShopFilter === 'All') || (i.type === currentShopFilter);
            const matchesSearch = i.name.toUpperCase().includes(searchText);
            return matchesType && matchesSearch;
        });

        if (filteredItems.length === 0) return '';

        return `
        <div class="arena-card">
            <div class="arena-header">${shop.arena}</div>
            <div class="arena-scroll">
                <table class="arena-table">
                    ${filteredItems.map(i => {
                        const isChaos = i.name.includes("Chaos");
                        const costColor = isChaos ? "var(--chaos-cost)" : "#ffd700";
                        const displayCost = i.cost !== undefined ? i.cost : '0';
                        return `
                        <tr>
                            <td>${i.name}</td>
                            <td class="arena-type">${i.type}</td>
                            <td class="arena-cost" style="color:${costColor};">${displayCost}</td>
                        </tr>`;
                    }).join('')}
                </table>
            </div>
        </div>
    `}).join(''); 
}

function toggleCompareTool() {
    const area = document.getElementById('compare-tool-area');
    if (area.classList.contains('hidden')) {
        area.classList.remove('hidden');
        const selA = document.getElementById('compareSelectA');
        const selB = document.getElementById('compareSelectB');
        if (selA.options.length <= 1) {
            deviations.forEach(dev => {
                const opt = document.createElement('option');
                opt.value = dev.name; opt.textContent = dev.name;
                selA.appendChild(opt);
                selB.appendChild(opt.cloneNode(true));
            });
        }
    } else {
        area.classList.add('hidden');
    }
}
function closeCompareTool() { document.getElementById('compare-tool-area').classList.add('hidden'); }

function updateComparison() {
    const nameA = document.getElementById('compareSelectA').value;
    const nameB = document.getElementById('compareSelectB').value;
    const resultArea = document.getElementById('compareResults');
    if (nameA === "Select Deviation A" || nameB === "Select Deviation B") return;
    
    const devA = deviations.find(d => d.name === nameA);
    const devB = deviations.find(d => d.name === nameB);
    const skillsA = new Set(devA.techniques);
    const skillsB = new Set(devB.techniques);
    const shared = [...skillsA].filter(x => skillsB.has(x)).sort();
    const uniqueA = [...skillsA].filter(x => !skillsB.has(x)).sort();
    const uniqueB = [...skillsB].filter(x => !skillsA.has(x)).sort();
    
    const renderList = (list, isShared) => list.length ? list.map(s => {
        const tech = techniquesData.find(t => t.name === s);
        const desc = tech ? safeTooltip(tech.description) : s;
        return `<div class="skill-item ${isShared?'skill-shared':''}" onmouseenter="showTooltip(event, '${desc}')" onmouseleave="hideTooltip()">${s}</div>`;
    }).join('') : '<div style="opacity:0.5; font-size:0.8rem; text-align:center;">None</div>';
    
    resultArea.innerHTML = `
        <div class="compare-col"><div class="col-header">${devA.name}</div>${renderList(uniqueA, false)}</div>
        <div class="compare-col" style="border-color:var(--accent)"><div class="col-header" style="color:var(--accent)">Shared</div>${renderList(shared, true)}</div>
        <div class="compare-col"><div class="col-header">${devB.name}</div>${renderList(uniqueB, false)}</div>
    `;
}

function auditData() { const techDefinitions = new Set(techniquesData.map(t => t.name)); deviations.forEach(dev => { dev.techniques.forEach(tech => { if (!techDefinitions.has(tech)) console.warn(`Missing definition: "${tech}"`); }); }); }
function openDataModal() { const modal = document.getElementById('dataSyncModal'); const statusDiv = document.getElementById('dataSyncStatus'); modal.classList.remove('hidden'); const techDefinitions = new Set(techniquesData.map(t => t.name)); let missingTechCount = 0; let html = ""; deviations.forEach(dev => { dev.techniques.forEach(tech => { if (!techDefinitions.has(tech)) { missingTechCount++; html += `<div style="font-size:0.85rem; padding:4px 0; border-bottom:1px dotted #333;"><span style="color:var(--danger)">MISSING:</span> ${tech} (${dev.name})</div>`; } }); }); let missingPsi = 0; let missingPassive = 0; deviations.forEach(dev => { if (!dev.psi || dev.psi === "Data needed") missingPsi++; if (!dev.passive || dev.passive === "Data needed") missingPassive++; }); statusDiv.innerHTML = missingTechCount === 0 ? `<h4 style="color:var(--success);">✅ Core Data Synced Successfully!</h4>` : `<h4 style="color:var(--danger);">${missingTechCount} Issues Found</h4>${html}`; statusDiv.innerHTML += `<div style="margin-top: 20px; border-top: 1px solid #444; padding-top: 10px; font-size: 0.85rem; color: #ccc;"><div style="display:flex; justify-content: space-between; margin-bottom:4px;"><span>Total Deviations:</span> <strong>${deviations.length}</strong></div><div style="display:flex; justify-content: space-between; margin-bottom:4px;"><span>Total Techniques:</span> <strong>${techniquesData.length}</strong></div><div style="display:flex; justify-content: space-between; margin-bottom:10px;"><span>Total Traits:</span> <strong>${traits.length}</strong></div><div style="border-top:1px dotted #444; margin-top:5px; padding-top:5px;"><div style="display:flex; justify-content: space-between; color:#ffb74d;"><span>PSI Data Missing:</span> <strong>${missingPsi} / ${deviations.length}</strong></div><div style="display:flex; justify-content: space-between; color:#ffb74d;"><span>Passive Data Missing:</span> <strong>${missingPassive} / ${deviations.length}</strong></div></div></div>`; }
function closeDataModal() { document.getElementById('dataSyncModal').classList.add('hidden'); }

function populateUI() {
    sourceSelect.innerHTML = ""; builderDevSelect.innerHTML = "";
    deviations.forEach(dev => {
        const opt = document.createElement('option');
        opt.value = dev.name; opt.textContent = dev.name;
        sourceSelect.appendChild(opt);
        builderDevSelect.appendChild(opt.cloneNode(true));
    });
    const techniqueSet = new Set();
    deviations.forEach(d => d.techniques.forEach(t => techniqueSet.add(t)));
    allUniqueTechniques = Array.from(techniqueSet).sort();
    searchTechniqueSelect.innerHTML = "";
    allUniqueTechniques.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t; searchTechniqueSelect.appendChild(opt);
    });
    buildTechniquesTable(); buildTraitsTable(); buildArenaShops();
    sourceSelect.onchange = updateTechniques; builderDevSelect.onchange = updateBuilderTechniques;
    updateTechniques(); updateBuilderTechniques();
}

function showTooltip(e, input) {
    if (window.innerWidth <= 768) return;
    let content = "";
    const techniqueInfo = techniquesData.find(t => t.name === input);
    content = techniqueInfo ? techniqueInfo.description : input;
    if (content) { tooltip.innerHTML = content; tooltip.style.display = 'block'; moveTooltip(e); }
}
function hideTooltip() { tooltip.style.display = 'none'; }
function moveTooltip(e) { tooltip.style.left = (e.pageX + 15) + 'px'; tooltip.style.top = (e.pageY + 15) + 'px'; }
document.addEventListener('mousemove', (e) => { if (tooltip.style.display === 'block') moveTooltip(e); });

function buildTechniquesTable() { document.getElementById('techniquesBody').innerHTML = allUniqueTechniques.map(t => { const info = techniquesData.find(x => x.name === t); return `<tr><td style="font-weight:bold; color:#e0e0e0;">${t}</td><td style="color:#aaa;">${info ? info.description : 'Data needed'}</td></tr>`; }).join(''); }
function filterTechniquesLib() { const val = document.getElementById('searchTechniquesLib').value.toUpperCase(); document.querySelectorAll('#techniquesBody tr').forEach(row => { row.style.display = row.innerText.toUpperCase().includes(val) ? "" : "none"; }); }

function buildTraitsTable() { 
    const tbody = document.getElementById('traitsBody');
    const sortedTraits = [...traits].sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = sortedTraits.map(t => {
        return `
        <tr data-category="${t.category}">
            <td style="font-weight:600; color:#e0e0e0;">
                ${t.name}
            </td>
            <td>${t.source || '-'}</td>
            <td>${t.category}</td>
            <td>${t.description}</td>
        </tr>
    `}).join('');
}

function applyFilter(category, btn) { 
    currentCategoryFilter = category; 
    const container = btn.parentElement;
    container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); 
    filterTraits(); 
}

function filterTraits() { 
    const val = document.getElementById('searchTraits').value.toUpperCase(); 
    
    document.querySelectorAll('#traitsBody tr').forEach(row => { 
        const text = row.innerText.toUpperCase(); 
        const cat = row.getAttribute('data-category'); 
        
        const matchCat = (currentCategoryFilter === 'All') || (cat === currentCategoryFilter); 
        const matchText = text.includes(val);

        if (matchText && matchCat) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }); 
}

function filterDeviants(typeFilter, btn) {
    const area = document.getElementById('deviant-results-area'); const input = document.getElementById('deviantSearchInput');
    if (typeFilter) {
        if (currentDeviantTypeFilter === typeFilter && !area.classList.contains('hidden')) { area.classList.add('hidden'); return; }
        area.classList.remove('hidden'); currentDeviantTypeFilter = typeFilter;
        document.querySelectorAll('#deviant-filter-container .filter-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
    }
    const query = input.value.toUpperCase(); if (query.length > 0) area.classList.remove('hidden'); renderDeviants();
}
function resetDeviantSearch() { document.getElementById('deviantSearchInput').value = ""; currentDeviantTypeFilter = 'All'; document.querySelectorAll('#deviant-filter-container .filter-btn').forEach(b => b.classList.remove('active')); document.querySelector('.btn-all').classList.add('active'); document.getElementById('deviant-results-area').classList.add('hidden'); isListExpanded = false; renderDeviants(); }

function renderDeviants() {
    const query = document.getElementById('deviantSearchInput').value.toUpperCase();
    const container = document.getElementById('deviant-results-area');
    container.innerHTML = "";
    deviations.forEach(dev => {
        const nameMatch = dev.name.toUpperCase().includes(query);
        const typeMatch = (currentDeviantTypeFilter === 'All') || (dev.type === currentDeviantTypeFilter);
        if (nameMatch && typeMatch) {
            let status = 'status-neutral';
            if(dev.type === 'Combat') status = 'status-risky';
            if(dev.type === 'Territory') status = 'status-perfect';
            if(dev.type === 'Crafting') status = 'status-crafting'; 
            
            let psiDesc = dev.psi || "Data needed";
            if(psiDesc.includes(':')) psiDesc = psiDesc.split(/:(.*)/s)[1].trim();
            
            let passDesc = dev.passive || "Data needed";
            if(passDesc.includes(':')) passDesc = passDesc.split(/:(.*)/s)[1].trim();
            
            const psiStr = (dev.psi && dev.psi !== "Data needed") ? dev.psi.split(':')[0] : "-";
            const passStr = (dev.passive && dev.passive !== "Data needed") ? dev.passive.split(':')[0] : "-";

            container.innerHTML += `
                <div class="uni-card ${status}">
                    <div class="card-header"><span class="card-title">${dev.name}</span><span class="card-badge">${dev.type}</span></div>
                    <div class="tag-list">${dev.techniques.map(t => {
                        const techData = techniquesData.find(td => td.name === t);
                        const techTip = techData ? safeTooltip(techData.description) : t;
                        return `<span class="uni-tag" onmouseenter="showTooltip(event, '${techTip}')" onmouseleave="hideTooltip()">${t}</span>`;
                    }).join('')}</div>
                    <div class="card-divider"></div>
                    <div class="card-body">
                        <div style="margin-bottom:4px; cursor:help;" onmouseenter="showTooltip(event, '${safeTooltip(psiDesc)}')" onmouseleave="hideTooltip()"><strong style="color:#aaa;">PSI:</strong> ${psiStr}</div>
                        <div style="cursor:help;" onmouseenter="showTooltip(event, '${safeTooltip(passDesc)}')" onmouseleave="hideTooltip()"><strong style="color:#aaa;">Passive:</strong> ${passStr}</div>
                    </div>
                </div>`;
        }
    });
}

function resetTechniqueSearch() { searchTechniqueSelect.selectedIndex = 0; document.getElementById('technique-results-area').innerHTML = ""; document.getElementById('technique-search-description').style.display = 'none'; }
function resetIsolationChecker() { sourceSelect.selectedIndex = 0; updateTechniques(); document.getElementById('results-area').innerHTML = ""; }
function updateTechniques() { const dev = deviations.find(d => d.name === sourceSelect.value); techniqueSelect.innerHTML = ""; if(dev) dev.techniques.forEach(t => techniqueSelect.innerHTML += `<option>${t}</option>`); }

function findPartners() { 
    const sName = sourceSelect.value; 
    const tTechnique = techniqueSelect.value; 
    const sDev = deviations.find(d => d.name === sName); 
    const unwanted = sDev.techniques.filter(t => t !== tTechnique); 
    const resDiv = document.getElementById('results-area'); 
    resDiv.innerHTML = ""; 
    const candidates = deviations.filter(d => d.name !== sName && d.techniques.includes(tTechnique))
        .map(d => ({ name: d.name, overlap: d.techniques.filter(t => unwanted.includes(t)).length, overlapTechniques: d.techniques.filter(t => unwanted.includes(t)) }))
        .sort((a,b) => a.overlap - b.overlap); 
    if(candidates.length === 0) return resDiv.innerHTML = "<p>No partners found.</p>"; 
    candidates.forEach(c => { 
        let status = 'status-risky'; let label = 'RISKY';
        if (c.overlap === 0) { status = 'status-perfect'; label = 'PERFECT'; }
        else if (c.overlap === 1) { status = 'status-good'; label = 'GOOD'; }
        
        resDiv.innerHTML += `
            <div class="uni-card gradient-card ${status}">
                <div class="card-header">
                    <span class="card-title">${c.name}</span>
                    <span class="card-badge">${label}</span>
                </div>
                <div class="card-body">Technique Overlap: <strong style="color:white">${c.overlap}</strong></div>
                ${c.overlap > 0 ? `<div class="card-risk">Risk: ${c.overlapTechniques.join(', ')}</div>` : ''}
            </div>
        `;
    }); 
}

function searchByTechnique() { const technique = searchTechniqueSelect.value; const area = document.getElementById('technique-results-area'); const descContainer = document.getElementById('technique-search-description'); area.innerHTML = ""; const info = techniquesData.find(t => t.name === technique); descContainer.innerHTML = info ? info.description : "No description."; descContainer.style.display = 'block'; const results = deviations.filter(d => d.techniques.includes(technique)); if (results.length === 0) return area.innerHTML = "<p>No results.</p>"; results.forEach(d => area.innerHTML += `<div class="uni-card status-neutral"><div class="card-header"><span class="card-title">${d.name}</span></div></div>`); }

function addTrait() {
    const input = document.getElementById('traitInput');
    const val = input.value.trim();
    if(!val) return;
    let traitName = val; let traitSource = "";
    const match = val.match(/^(.*) \[(.*)\]$/);
    if (match) { traitName = match[1]; traitSource = match[2]; }
    
    // Removed legacy slot text replacement logic
    
    let traitInfo;
    if (traitSource) traitInfo = traits.find(t => t.name === traitName && t.source === traitSource);
    else traitInfo = traits.find(t => t.name === traitName);
    if (!traitInfo) { alert("Trait not found in database."); return; }
    const duplicate = userSelectedTraits.find(t => t.name === traitInfo.name && t.source === traitInfo.source);
    if(duplicate) { input.value = ""; return; }
    userSelectedTraits.push(traitInfo);
    renderSelectedTraits();
    input.value = "";
}
function removeTrait(index) { userSelectedTraits.splice(index, 1); renderSelectedTraits(); }

function renderSelectedTraits() {
    const container = document.getElementById('selectedTraits');
    container.innerHTML = "";
    userSelectedTraits.forEach((t, idx) => {
        container.innerHTML += `
            <div class="trait-mini-card">
                <span>${t.name}</span>
                <span class="remove-btn" onclick="removeTrait(${idx}); event.stopPropagation();">✕</span>
            </div>`;
    });
}

function updateBuilderTechniques() {
    const dev = deviations.find(d => d.name === builderDevSelect.value);
    const container = document.getElementById('builderCheckboxes');
    container.innerHTML = "";
    document.getElementById('builderResults').innerHTML = "";
    if (dev) {
        [...dev.techniques].sort().forEach(technique => {
            const techData = techniquesData.find(td => td.name === technique);
            const desc = techData ? safeTooltip(techData.description) : technique;
            
            container.innerHTML += `<div class="checkbox-item" onmouseenter="showTooltip(event, '${desc}')" onmouseleave="hideTooltip()" onclick="document.getElementById('chk_${technique.replace(/[^a-zA-Z0-9]/g,'')}').click()"><input type="checkbox" id="chk_${technique.replace(/[^a-zA-Z0-9]/g,'')}" value="${technique}" onclick="event.stopPropagation()"><label>${technique}</label></div>`;
        });
    }
}

function generatePlan() {
    if (typeof isTeamMode !== 'undefined' && isTeamMode) {
        saveCurrentBuildToSlot(activeTeamSlot);
        renderTeamSlots(); 
    } else {
        const teamUI = document.getElementById('team-ui-area');
        if (teamUI && teamUI.classList.contains('hidden')) teamUI.classList.remove('hidden');
    }

    const name = builderDevSelect.value;
    const sourceDev = deviations.find(d => d.name === name);
    const selected = Array.from(document.querySelectorAll('#builderCheckboxes input:checked')).map(cb => cb.value);
    const results = document.getElementById('builderResults');
    
    if (selected.length === 0 && userSelectedTraits.length === 0) return results.innerHTML = "<p style='color:var(--warning)'>Please select at least one technique or trait.</p>";
    
    let html = ``;
    
    if (selected.length > 0) {
        html += `<div style="grid-column:1/-1; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px; color:white; font-weight:bold;">TECHNIQUE DONORS</div>`;
        selected.forEach((technique, index) => {
            const unwanted = sourceDev.techniques.filter(t => t !== technique);
            
            const candidates = deviations.filter(d => d.name !== name && d.techniques.includes(technique))
                .map(d => ({ 
                    name: d.name, 
                    overlap: d.techniques.filter(t => unwanted.includes(t)).length, 
                    overlapTechniques: d.techniques.filter(t => unwanted.includes(t)) 
                }))
                .sort((a,b) => {
                    if (a.overlap !== b.overlap) return a.overlap - b.overlap;
                    const aShop = shopDeviationNames.has(a.name);
                    const bShop = shopDeviationNames.has(b.name);
                    if (aShop !== bShop) return aShop ? -1 : 1;
                    if (aShop && bShop) {
                        const aChaos = a.name.includes("Chaos");
                        const bChaos = b.name.includes("Chaos");
                        if (aChaos !== bChaos) return aChaos ? 1 : -1;
                    }
                    return a.name.localeCompare(b.name);
                });
            
            let initClass = 'status-risky';
            if (candidates.length > 0) {
                if (candidates[0].overlap === 0) initClass = 'status-perfect';
                else if (candidates[0].overlap === 1) initClass = 'status-good';
            }

            const techData = techniquesData.find(td => td.name === technique);
            const techTip = techData ? safeTooltip(techData.description) : technique;

            html += `
            <div class="uni-card gradient-card donor-card ${initClass}" id="technique-card-${index}">
                <div class="card-header">
                    <span class="card-title" onmouseenter="showTooltip(event, '${techTip}')" onmouseleave="hideTooltip()">${technique}</span>
                    <div style="display:flex; align-items:center;">
                        <span class="badge-shop" onmouseenter="showTooltip(event, 'Found in Shop')" onmouseleave="hideTooltip()">SHOP</span>
                        <span class="card-badge badge-dynamic">Calculating...</span>
                    </div>
                </div>
                <div class="card-risk dynamic-risk"></div>
                
                <div class="donor-select-container">
                    <select class="donor-select" onchange="updateDonorCard(this)" style="padding:6px; background:#1a1a1a; font-size:0.8rem;">
            `;
            if(candidates.length === 0) html += `<option>No donors found</option>`;
            else {
                candidates.forEach(c => {
                    let label = c.overlap === 0 ? "PERFECT" : (c.overlap === 1 ? "GOOD" : "RISKY");
                    const junkStr = c.overlap > 0 ? `Risk: ${c.overlapTechniques.join(', ')}` : "";
                    const isShop = shopDeviationNames.has(c.name);
                    const arenaName = shopDeviationArena[c.name] || "";
                    html += `<option value="${c.overlap}" data-label="${label}" data-junk="${junkStr}" data-shop="${isShop}" data-arena="${arenaName}">(${label}) ${c.name} ${isShop ? '[SHOP]' : ''}</option>`;
                });
            }
            html += `</select></div></div>`;
        });
    }

    if (userSelectedTraits.length > 0) {
        html += `<div style="grid-column:1/-1; margin:15px 0 10px 0; border-bottom:1px solid #333; padding-bottom:5px; color:white; font-weight:bold;">PASSIVE TRAIT SOURCES</div>`;
        
        userSelectedTraits.forEach(t => {
            html += `
                <div class="uni-card status-purple" onmouseenter="showTooltip(event, '${safeTooltip(t.description)}')" onmouseleave="hideTooltip()">
                    <div class="card-header left-align">
                        <span class="card-title">${t.name}</span>
                    </div>
                    <div class="card-body">Source: <strong style="color:white">${t.source}</strong></div>
                </div>
            `;
        });
    }
    
    results.innerHTML = html;
    setTimeout(() => { document.querySelectorAll('.donor-select').forEach(sel => updateDonorCard(sel)); }, 10);
}

function updateDonorCard(select) {
    const card = select.closest('.uni-card');
    const selectedOption = select.options[select.selectedIndex];
    const label = selectedOption.getAttribute('data-label');
    const junk = selectedOption.getAttribute('data-junk');
    const isShop = selectedOption.getAttribute('data-shop') === "true";
    const arena = selectedOption.getAttribute('data-arena');
    
    const badge = card.querySelector('.badge-dynamic');
    const shopBadge = card.querySelector('.badge-shop');
    const riskDiv = card.querySelector('.dynamic-risk');
    
    card.classList.remove('status-perfect', 'status-good', 'status-risky', 'status-neutral');
    
    badge.textContent = label;
    riskDiv.textContent = junk;

    if (label === "PERFECT") card.classList.add('status-perfect');
    else if (label === "GOOD") card.classList.add('status-good');
    else card.classList.add('status-risky');

    if (isShop) { 
        shopBadge.style.display = "inline-block"; 
        shopBadge.onmouseenter = (e) => showTooltip(e, arena);
        shopBadge.onmouseleave = hideTooltip;
    } else { 
        shopBadge.style.display = "none"; 
        shopBadge.onmouseenter = null;
    }
}

function resetBuilder(keepTeamMode = false) {
    builderDevSelect.selectedIndex = 0; updateBuilderTechniques(); userSelectedTraits = [];
    document.getElementById('traitInput').value = ""; document.getElementById('builderResults').innerHTML = ""; renderSelectedTraits();
    if (!keepTeamMode && typeof deleteTeam === 'function') deleteTeam();
}

function loadShareCode() {
    const code = document.getElementById('shareCodeInput').value.trim();
    if(!code) return;
    try {
        const payload = JSON.parse(atob(code));
        if (Array.isArray(payload)) { document.getElementById('team-ui-area').classList.remove('hidden'); teamData = payload; if(typeof initTeamMode==="function"){initTeamMode(true);activeTeamSlot=0;renderTeamSlots();if(teamData[0])restoreBuildFromData(teamData[0]);} } 
        else { if (typeof isTeamMode !== 'undefined' && isTeamMode) restoreBuildFromData(payload); else restoreBuildFromData(payload); }
        document.getElementById('shareStatus').textContent = "Loaded!";
    } catch(e) { alert("Invalid Code"); }
}

function generateShareCode() {
    let payload;
    if (typeof isTeamMode !== 'undefined' && isTeamMode) { saveCurrentBuildToSlot(activeTeamSlot); payload = teamData; } 
    else {
        const target = builderDevSelect.value;
        const skills = Array.from(document.querySelectorAll('#builderCheckboxes input:checked')).map(cb => cb.value);
        const traitData = userSelectedTraits.map(t => ({n: t.name, s: t.source}));
        if (skills.length === 0 && traitData.length === 0) return;
        payload = { d: target, s: skills, t: traitData };
    }
    const base64 = btoa(JSON.stringify(payload));
    navigator.clipboard.writeText(base64);
    document.getElementById('shareCodeInput').value = base64;
    document.getElementById('shareStatus').textContent = "Copied!";
}

init();

}

{
type: uploaded file
fileName: slots.js
fullContent:
/* ========================================================================
   ARCHIVED SLOT LOGIC
   Disabled Feature: Slot Filtering and Badges
   Date Archived: 2023-10-XX
   Reason: Data inconsistencies in slot assignments.
   
   To restore:
   1. Add this file to index.html (uncomment the script tag) or merge logic back to script.js.
   2. Restore the buttons in index.html.
   3. Restore the CSS in styles.css.
========================================================================
*/

/* === ARCHIVED CSS (styles.css) ===

.slot-badge {
    background-color: #444;
    color: white;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.75rem;
    font-weight: normal;
    user-select: none;
    display: inline-block;
}

.slot-badge.float-right {
    float: right;
    margin-left: 8px;
}

.slot-badge.mini {
    font-size: 0.7em;
    padding: 0 4px;
    border-radius: 3px;
    margin-left: 5px;
    color: #ddd;
}

.warning-badge {
    background-color: var(--danger);
    color: white;
    border-radius: 4px;
    padding: 1px 8px;
    font-size: 0.75rem;
    font-weight: bold;
    user-select: none;
    cursor: help;
    display: inline-block;
}

.card-header.left-align {
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
}
*/


/* === ARCHIVED JS FUNCTIONS === */

// State Variable
// let currentSlotFilter = 'All';

// Function: Apply Slot Filter (Button Click)
function applySlotFilter(slot, btn) {
    currentSlotFilter = String(slot);
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterTraits();
}

/* LOGIC SNIPPET: Filter Traits (Inside filterTraits function)
   
   const slot = row.getAttribute('data-slot'); 
   const matchSlot = (currentSlotFilter === 'All') || (String(slot) === currentSlotFilter);
   
   // Add matchSlot to the final condition
   if (matchText && matchCat && matchSlot) ...
*/


/* LOGIC SNIPPET: Build Table Badge (Inside buildTraitsTable)
   
   let slotBadge = t.slot ? `<span class="slot-badge float-right">S${t.slot}</span>` : '';
   // Add ${slotBadge} inside the <td>
*/


/* LOGIC SNIPPET: Dropdown Text (Inside filterTraitDropdown)
   
   const slotStr = t.slot ? ` [S${t.slot}]` : '';
   div.innerHTML = `${t.name} <span>[${t.source}]${slotStr}</span>`;
*/


/* LOGIC SNIPPET: Render Selected Traits (Inside renderSelectedTraits)
   
   const slotBadge = t.slot ? `<span class="slot-badge mini">S${t.slot}</span>` : '';
   // Add ${slotBadge} to span
*/


/* LOGIC SNIPPET: Generate Plan - Duplicate Warning (Inside generatePlan)
   
   // 1. Calculate Duplicates
   const slotCounts = {};
   userSelectedTraits.forEach(t => {
       if (t.slot) {
           slotCounts[t.slot] = (slotCounts[t.slot] || 0) + 1;
       }
   });

   // 2. Render Badge & Warning
   userSelectedTraits.forEach(t => {
       const slotBadge = t.slot ? `<span class="slot-badge">S${t.slot}</span>` : '';
       
       let warningBadge = '';
       if (t.slot && slotCounts[t.slot] > 1) {
           warningBadge = `<span class="warning-badge" onmouseenter="showTooltip(event, 'Warning: duplicate slot detected...')" onmouseleave="hideTooltip()">!</span>`;
       }

       html += `
           <div class="uni-card status-purple" ...>
               <div class="card-header left-align">
                   <span class="card-title">${t.name}</span>
                   ${warningBadge}
                   ${slotBadge}
               </div>
               ...
           </div>
       `;
   });
*/
}

{
type: uploaded file
fileName: styles.css
fullContent:
:root {
    --bg-body: #121212; 
    --bg-panel: #1e1e1e; 
    --bg-input: #2d2d30;
    --bg-card: #252526;
    
    --border: #3e3e42; 
    --radius: 4px;

    --text-main: #e0e0e0; 
    --text-muted: #858585;
    
    --accent: #00d4f1; 
    --purple: #bf5af2;
    --success: #4caf50; 
    --warning: #ffc107; 
    --danger: #ff5252;
    
    --chaos-cost: #ff7043; 
    
    --type-combat: #ff5252; 
    --type-territory: #4caf50; 
    --type-crafting: #2196f3; 
    --type-all: #757575;
    
    --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body { 
    background: var(--bg-body); 
    color: var(--text-main); 
    font-family: var(--font-ui); 
    margin: 0; 
    padding: 20px; 
    line-height: 1.5; 
}

.container { 
    max-width: 1200px; 
    margin: 0 auto; 
}

/* === TYPOGRAPHY === */
h1, h2, h3, h4 { 
    font-family: var(--font-ui); 
    color: white; 
    margin-top: 0; 
    font-weight: 700; 
}
.accent-text { color: var(--accent); }

/* === BUTTONS === */
button, .btn-link {
    font-family: var(--font-ui); 
    font-size: 0.9rem; 
    padding: 8px 16px;
    background: #333; 
    border: 1px solid var(--border); 
    color: #e0e0e0;
    border-radius: var(--radius); 
    cursor: pointer; 
    transition: background 0.1s;
    display: inline-flex; 
    align-items: center; 
    justify-content: center; 
    text-decoration: none;
}
button:hover, .btn-link:hover { background: #444; color: #fff; }

.btn-primary { background: var(--accent); color: #000; border-color: var(--accent); font-weight: bold; }
.btn-primary:hover { background: #08b2cb; opacity: 0.9; }

.btn-neutral { background: #5a5a60; color: white; border-color: #777; font-weight: bold; }
.btn-neutral:hover { background: #6f6f75; border-color: #888; }

.btn-sq { width: 38px; height: 38px; padding: 0; }

.btn-close { 
    background: transparent; border: none; color: #666; font-size: 1.1rem; padding: 0 5px; cursor: pointer; 
}
.btn-close:hover { color: var(--danger); }

/* Filters & Tabs */
.filter-btn { border-radius: 20px; font-size: 0.8rem; background: transparent; color: #888; border: 1px solid #444; }
.filter-btn:hover { border-color: #666; color: white; }
.filter-btn.active { color: white; border-color: transparent; font-weight: bold; }

.btn-all.active { background: var(--type-all); }
.btn-combat.active { background: var(--type-combat); }
.btn-territory.active { background: var(--type-territory); }
.btn-crafting.active { background: var(--type-crafting); }

#btnArenaShops.active { background: var(--success); color: white; border-color: var(--success); }
#btnTechniquesLib.active { background: var(--accent); color: black; border-color: var(--accent); }
#btnLib.active { background: var(--purple); color: white; border-color: var(--purple); }

/* === INPUTS === */
input[type="text"], select { 
    background: var(--bg-input); 
    border: 1px solid var(--border); 
    color: white; 
    padding: 10px; 
    width: 100%; 
    border-radius: var(--radius); 
}
input:focus, select:focus { outline: none; border-color: #666; }

/* === PANELS === */
.tool-panel { 
    background: var(--bg-panel); 
    border: 1px solid var(--border); 
    padding: 20px; 
    margin-bottom: 20px; 
    border-radius: var(--radius); 
    border-top: 3px solid #333; 
}
.hidden { display: none !important; }

/* === GRIDS & LAYOUTS === */
.grid-cols { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 15px; }

.checkbox-grid { 
    display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; 
    padding: 15px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius); 
}
.checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; padding: 4px; }
.checkbox-item:hover { color: white; }
.checkbox-item input { accent-color: var(--accent); transform: scale(1.1); }

.header-actions { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }

.arena-grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-top: 15px; }
@media (min-width: 1100px) { .arena-grid-layout { grid-template-columns: repeat(4, 1fr); } }

/* === ARENA & TABLES === */
.arena-card { 
    background: var(--bg-card); 
    border: 1px solid var(--border); 
    border-top: 3px solid var(--success); 
    border-radius: var(--radius); 
    overflow: hidden; 
}
.arena-header { 
    background: rgba(76, 175, 80, 0.05); 
    padding: 8px 12px; 
    font-weight: bold; 
    color: #fff; 
    border-bottom: 1px solid var(--border); 
    font-size: 0.9rem; 
}

.arena-scroll {
    max-height: 300px; 
    overflow-y: auto;
}
.arena-scroll::-webkit-scrollbar { width: 6px; }
.arena-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
.arena-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
.arena-scroll::-webkit-scrollbar-thumb:hover { background: #555; }

.arena-table { width: 100%; border-collapse: collapse; }
.arena-table td { 
    padding: 4px 10px; 
    border-bottom: 1px solid #333; 
    font-size: 0.75rem; 
    color: #ccc; 
}
.arena-table tr:last-child td { border-bottom: none; }

.arena-table .arena-type {
    font-size: 0.7rem;
    font-style: italic;
    color: #666;
}

.arena-table .arena-cost {
    text-align: right; 
    font-family: monospace; 
    font-weight: bold;
    font-size: 0.8rem;
}

table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; font-size: 0.85rem; }
th { background: #252526; color: #e0e0e0; font-weight: 600; }
tr:nth-child(even) { background-color: #1a1a1a; }
tr:hover { background-color: #2a2a2a; }

/* === UNIFIED CARD SYSTEM === */
.uni-card {
    background: #252526;
    padding: 15px;
    margin-bottom: 10px;
    border-radius: 4px;
    border-left: 4px solid #666; 
    display: flex; flex-direction: column; gap: 8px;
    position: relative;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.card-header.left-align { justify-content: flex-start; align-items: center; gap: 8px; }

.card-title { font-weight: 700; font-size: 1rem; color: white; }
.card-body { font-size: 0.85rem; color: #ccc; }
.card-divider { height: 1px; background: #3e3e42; margin: 6px 0; }
.card-risk { font-size: 0.8rem; color: var(--danger); margin-top: 4px; }

.status-perfect { border-left-color: var(--success); }
.status-good { border-left-color: var(--warning); }
.status-risky { border-left-color: var(--danger); }
.status-neutral { border-left-color: #666; }
.status-crafting { border-left-color: var(--type-crafting); }
.status-purple { border-left-color: var(--purple); }

.gradient-card.status-perfect { background: linear-gradient(90deg, rgba(76, 175, 80, 0.1) 0%, transparent 100%); }
.gradient-card.status-good { background: linear-gradient(90deg, rgba(255, 193, 7, 0.1) 0%, transparent 100%); }
.gradient-card.status-risky { background: linear-gradient(90deg, rgba(255, 82, 82, 0.1) 0%, transparent 100%); }

.card-badge { font-size: 0.7rem; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px; }
.status-perfect .card-badge { color: var(--success); background: rgba(76, 175, 80, 0.15); }
.status-good .card-badge { color: var(--warning); background: rgba(255, 193, 7, 0.15); }
.status-risky .card-badge { color: var(--danger); background: rgba(255, 82, 82, 0.15); }
.status-neutral .card-badge { color: #aaa; background: rgba(255,255,255,0.05); }
.status-crafting .card-badge { color: var(--type-crafting); background: rgba(33, 150, 243, 0.15); }
.badge-shop { background: #2e7d32; color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; margin-right: 5px; display: inline-block; cursor: help; }

/* === SLOT BADGES === */
/* Moved to slots_archive.js */

/* === WARNING BADGE === */
/* Moved to slots_archive.js */

.tag-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; min-height: 72px; align-content: flex-start; }
.uni-tag { font-size: 0.7rem; background: #333; padding: 2px 8px; border: 1px solid #444; color: #bbb; border-radius: 4px; cursor: help; }
.uni-tag:hover { border-color: var(--accent); color: white; background: #444; }

.donor-card { min-height: 110px; justify-content: space-between; }
.donor-select-container { margin-top: auto; padding-top: 10px; }
.donor-select { width: 100%; padding: 6px; background: #1a1a1a; font-size: 0.8rem; border: 1px solid #444; color: white; border-radius: 4px; }

.trait-mini-card {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(191, 90, 242, 0.15); 
    border: 1px solid var(--purple);
    border-radius: 4px;
    padding: 6px 12px;
    margin: 0 5px 5px 0;
    font-size: 0.9rem;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.trait-mini-card .remove-btn {
    cursor: pointer;
    font-weight: bold;
    font-size: 1rem;
    opacity: 0.7;
    margin-left: 5px;
    line-height: 1;
}
.trait-mini-card .remove-btn:hover {
    opacity: 1;
    color: #fff;
}

.tag-tech { border-color: rgba(0, 212, 241, 0.3); }
.tag-tech:hover { border-color: var(--accent); color: var(--accent); background: rgba(0, 212, 241, 0.1); }

.tag-trait { border-color: rgba(191, 90, 242, 0.3); }
.tag-trait:hover { border-color: var(--purple); color: var(--purple); background: rgba(191, 90, 242, 0.1); }

.team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }
.team-slot {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 15px; min-height: 140px; 
    display: flex; flex-direction: column; cursor: pointer; border-left: 4px solid #555;
    position: relative; transition: background 0.2s;
}
.team-slot:hover { background: #2a2a2a; }

.team-slot.active-slot { 
    border-left-color: #ffffff; 
    background: #333333; 
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    border-top: 1px solid #555;
    border-right: 1px solid #555;
    border-bottom: 1px solid #555;
}

.empty-slot { border-left: 4px dashed #444; align-items: center; justify-content: center; color: #666; font-size: 2rem; }

.input-with-dropdown { position: relative; flex: 1; }
#traitInput { width: 100%; box-sizing: border-box; }
.trait-dropdown {
    position: absolute; top: 100%; left: 0; width: 100%;
    background: #252526; border: 1px solid #444; border-top: none;
    max-height: 200px; overflow-y: auto; z-index: 50;
    border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;
    display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
}
.trait-option {
    padding: 8px 12px; font-size: 0.9rem; color: #ccc; cursor: pointer; border-bottom: 1px solid #333;
}
.trait-option:hover { background: #333; color: white; }
.trait-option span { color: #666; font-size: 0.8rem; margin-left: 5px; }

.compare-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px; }
.compare-col { background: var(--bg-card); border: 1px solid var(--border); padding: 10px; border-radius: var(--radius); }
.col-header { text-align: center; font-weight: bold; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px; font-size: 0.9rem; color: white; }
.skill-item { font-size: 0.8rem; padding: 4px 8px; background: #333; margin-bottom: 4px; text-align: center; border-radius: 4px; color: #ccc; cursor: help; }
.skill-item:hover { background: #444; color: white; }
.skill-shared { color: var(--accent); border: 1px solid rgba(0, 212, 241, 0.3); background: rgba(0, 212, 241, 0.05); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999; display: flex; justify-content: center; align-items: center; }
.modal-content { background: var(--bg-panel); border: 1px solid var(--border); padding: 25px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; border-radius: var(--radius); }

.close-modal { 
    cursor: pointer; font-size: 1.2rem; color: #aaa; transition: all 0.2s; 
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 4px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    user-select: none;
}
.close-modal:hover { color: white; background: var(--danger); border-color: var(--danger); }

#technique-tooltip {
    position: absolute; background: #111; border: 1px solid #555; color: #ddd;
    padding: 10px; font-size: 0.8rem; max-width: 280px; display: none; z-index: 1000;
    pointer-events: none; box-shadow: 0 4px 15px rgba(0,0,0,0.5); line-height: 1.4;
}

@media (max-width: 768px) {
    .team-grid, .compare-grid, .arena-grid-layout { grid-template-columns: 1fr; }
    .header-actions { flex-direction: column; }
    
    .header-actions > div { 
        flex-direction: row !important; 
        justify-content: center;
    }
}

}
