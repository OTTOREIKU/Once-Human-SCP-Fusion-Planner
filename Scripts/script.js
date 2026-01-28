let traits = [];
let matrix = {};
let arenaShops = [];
let currentCategoryFilter = 'All';
let currentSlotFilter = 'All';
let currentShopFilter = 'All';
let currentDeviantFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        fetch('traits.json').then(r => r.json()),
        fetch('matrix.json').then(r => r.json()),
        fetch('arena_shops.json').then(r => r.json())
    ]).then(([tData, mData, sData]) => {
        traits = tData;
        matrix = mData;
        arenaShops = sData;

        checkDataSync(traits, matrix, arenaShops); 

        buildTraitsTable();
        populateBuilderSelect();
        populateTechniquesLib(); 
        populateSourceSelect(); 
        populateSearchSelect();
        buildArenaShops();
        populateCompareSelects();
    }).catch(err => console.error("Error loading JSON:", err));
});

function toggleLibrary() {
    document.getElementById('traitsLibrary').classList.toggle('hidden');
    document.getElementById('arenaShops').classList.add('hidden');
    document.getElementById('techniquesLibrary').classList.add('hidden');
}

function toggleArenaShops() {
    document.getElementById('arenaShops').classList.toggle('hidden');
    document.getElementById('traitsLibrary').classList.add('hidden');
    document.getElementById('techniquesLibrary').classList.add('hidden');
}

function toggleTechniquesLibrary() {
    document.getElementById('techniquesLibrary').classList.toggle('hidden');
    document.getElementById('traitsLibrary').classList.add('hidden');
    document.getElementById('arenaShops').classList.add('hidden');
}

function buildTraitsTable() {
    const tbody = document.getElementById('traitsBody');
    const sortedTraits = [...traits].sort((a, b) => {
        const slotA = a.slot || 0;
        const slotB = b.slot || 0;
        return slotB - slotA; 
    });

    tbody.innerHTML = sortedTraits.map(t => {
        let slotBadge = '';
        if (t.slot) {
            let badgeColor = '#444'; 
            if (t.slot === 4) badgeColor = 'var(--accent)'; 
            else if (t.slot === 1) badgeColor = '#666'; 
            
            slotBadge = `<span style="float:right; font-size:0.75rem; color:white; background:${badgeColor}; padding:1px 6px; border-radius:4px; margin-left:8px;">S${t.slot}</span>`;
        }

        return `
        <tr data-category="${t.category}" data-slot="${t.slot || 'none'}">
            <td style="font-weight:600; color:#e0e0e0;">
                ${t.name}
                ${slotBadge}
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
    container.querySelectorAll('.filter-btn:not(.slot-btn)').forEach(b => b.classList.remove('active'));
    
    btn.classList.add('active');
    filterTraits();
}

function applySlotFilter(slot, btn) {
    currentSlotFilter = slot;
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterTraits();
}

function filterTraits() {
    const val = document.getElementById('searchTraits').value.toUpperCase();
    
    document.querySelectorAll('#traitsBody tr').forEach(row => {
        const text = row.innerText.toUpperCase();
        const cat = row.getAttribute('data-category');
        const slot = row.getAttribute('data-slot'); 
        
        const matchCat = (currentCategoryFilter === 'All') || (cat === currentCategoryFilter);
        const matchSlot = (currentSlotFilter === 'All') || (slot == currentSlotFilter);
        const matchText = text.includes(val);

        if (matchText && matchCat && matchSlot) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function populateTechniquesLib() {
    const tbody = document.getElementById('techniquesBody');
    let allTechs = [];
    Object.keys(matrix).forEach(devName => {
        const dev = matrix[devName];
        if(dev.techniques) {
            dev.techniques.forEach(t => {
                if(!allTechs.find(x => x.name === t.name)) {
                    allTechs.push(t);
                }
            });
        }
    });
    
    allTechs.sort((a,b) => a.name.localeCompare(b.name));

    tbody.innerHTML = allTechs.map(t => `
        <tr>
            <td style="font-weight:bold; color:var(--accent);">${t.name}</td>
            <td>${t.description}</td>
        </tr>
    `).join('');
}

function filterTechniquesLib() {
    const val = document.getElementById('searchTechniquesLib').value.toUpperCase();
    document.querySelectorAll('#techniquesBody tr').forEach(row => {
        const text = row.innerText.toUpperCase();
        row.style.display = text.includes(val) ? "" : "none";
    });
}

function buildArenaShops() {
    const container = document.getElementById('arenaShopsContainer');
    const searchVal = document.getElementById('searchArenaShop').value.toUpperCase();

    const filtered = arenaShops.filter(item => {
        const textMatch = item.name.toUpperCase().includes(searchVal) || 
                          (item.shopName && item.shopName.toUpperCase().includes(searchVal));
        const typeMatch = (currentShopFilter === 'All') || (item.type === currentShopFilter);
        return textMatch && typeMatch;
    });

    const grouped = {};
    filtered.forEach(item => {
        const shop = item.shopName || "Misc Shop";
        if(!grouped[shop]) grouped[shop] = [];
        grouped[shop].push(item);
    });

    container.innerHTML = Object.keys(grouped).map(shopName => {
        const items = grouped[shopName];
        const rows = items.map(i => {
            let costColor = i.cost >= 300 ? 'var(--accent)' : 'var(--highlight)';
            return `
            <div class="shop-row">
                <span class="shop-item-name">${i.name}</span>
                <span class="shop-item-type">${i.type}</span>
                <span class="shop-item-cost" style="color:${costColor}">${i.cost}</span>
            </div>
            `;
        }).join('');

        return `
        <div class="shop-card">
            <div class="shop-header">${shopName}</div>
            <div class="shop-body">
                ${rows}
            </div>
        </div>
        `;
    }).join('');
}

function applyShopFilter(filterType, btn) {
    currentShopFilter = filterType;
    document.querySelectorAll('#shop-filters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildArenaShops();
}

function populateBuilderSelect() {
    const sel = document.getElementById('builderDevSelect');
    sel.innerHTML = '<option value="">Select Deviation...</option>';
    
    Object.keys(matrix).sort().forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.text = key;
        sel.appendChild(opt);
    });
    
    sel.addEventListener('change', onBuilderDevChange);
}

function onBuilderDevChange() {
    const devName = document.getElementById('builderDevSelect').value;
    const container = document.getElementById('builderCheckboxes');
    
    if(!devName || !matrix[devName]) {
        container.innerHTML = '<span style="color:#666;">Select a deviation above first.</span>';
        return;
    }
    
    const techniques = matrix[devName].techniques || [];
    if(techniques.length === 0) {
        container.innerHTML = '<span>No known techniques for this deviation.</span>';
        return;
    }
    
    container.innerHTML = techniques.map((t, idx) => `
        <label class="checkbox-item">
            <input type="checkbox" value="${t.name}" class="tech-cb">
            <span>${t.name}</span>
        </label>
    `).join('');
}

function filterTraitDropdown() {
    const input = document.getElementById('traitInput');
    const filter = input.value.toUpperCase();
    const dropdown = document.getElementById('traitDropdown');
    
    dropdown.innerHTML = '';
    
    if(!filter && document.activeElement !== input) {
        dropdown.style.display = 'none';
        return;
    }

    const matches = traits.filter(t => t.name.toUpperCase().includes(filter));
    
    if(matches.length > 0) {
        dropdown.style.display = 'block';
        matches.slice(0, 10).forEach(t => {
            const div = document.createElement('div');
            div.innerText = t.name; 
            div.onclick = () => {
                input.value = t.name;
                dropdown.style.display = 'none';
            };
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = 'none';
    }
}

let desiredTraits = [];

function addTrait() {
    const input = document.getElementById('traitInput');
    const val = input.value.trim();
    if(!val) return;
    
    const tObj = traits.find(t => t.name.toLowerCase() === val.toLowerCase());
    if(!tObj) {
        alert("Trait not found in database.");
        return;
    }
    
    if(!desiredTraits.includes(tObj.name)) {
        desiredTraits.push(tObj.name);
        renderSelectedTraits();
    }
    input.value = '';
}

function renderSelectedTraits() {
    const container = document.getElementById('selectedTraits');
    container.innerHTML = desiredTraits.map(name => `
        <span class="trait-tag">
            ${name} <span style="cursor:pointer; margin-left:5px;" onclick="removeTrait('${name}')">×</span>
        </span>
    `).join('');
}

function removeTrait(name) {
    desiredTraits = desiredTraits.filter(x => x !== name);
    renderSelectedTraits();
}

function resetBuilder() {
    document.getElementById('builderDevSelect').value = "";
    document.getElementById('builderCheckboxes').innerHTML = '<span style="color:#666;">Select a deviation above first.</span>';
    desiredTraits = [];
    renderSelectedTraits();
    document.getElementById('builderResults').innerHTML = "";
    document.getElementById('traitInput').value = "";
}

function generatePlan() {
    const targetDev = document.getElementById('builderDevSelect').value;
    if(!targetDev) {
        alert("Please select a target deviation.");
        return;
    }

    const checkboxes = document.querySelectorAll('.tech-cb:checked');
    const desiredTechs = Array.from(checkboxes).map(cb => cb.value);

    let strategyHTML = `<h3>Strategy for ${targetDev}</h3>`;
    
    if(desiredTraits.length > 0) {
        strategyHTML += `<div class="result-box"><h4>Required Traits Sources</h4><ul>`;
        desiredTraits.forEach(traitName => {
            const tObj = traits.find(t => t.name === traitName);
            strategyHTML += `<li><b>${traitName}</b>: Found on <span style="color:var(--highlight)">${tObj ? tObj.source : 'Unknown'}</span></li>`;
        });
        strategyHTML += `</ul></div>`;
    }

    if(desiredTechs.length > 0) {
        strategyHTML += `<div class="result-box"><h4>Skill Mutagen Sources (Arena)</h4><ul>`;
        desiredTechs.forEach(tech => {
            const sources = arenaShops.filter(s => s.name === tech && s.type === 'Skill Mutagen');
            if(sources.length > 0) {
                const shopNames = sources.map(s => s.shopName).join(', ');
                strategyHTML += `<li><b>${tech}</b>: Buyable at ${shopNames}</li>`;
            } else {
                strategyHTML += `<li><b>${tech}</b>: Not found in Arena Shops (Check wild drops)</li>`;
            }
        });
        strategyHTML += `</ul></div>`;
    }
    
    document.getElementById('builderResults').innerHTML = strategyHTML;
}

function populateSourceSelect() {
    const s1 = document.getElementById('sourceDev');
    const s2 = document.getElementById('searchTechniqueSelect'); 
    s1.innerHTML = '<option value="">Select Deviation...</option>';
    s2.innerHTML = '<option value="">Select Technique...</option>';
    
    Object.keys(matrix).sort().forEach(k => {
        const opt = document.createElement('option');
        opt.value = k;
        opt.text = k;
        s1.appendChild(opt);
    });

    let techSet = new Set();
    Object.values(matrix).forEach(d => {
        if(d.techniques) d.techniques.forEach(t => techSet.add(t.name));
    });
    Array.from(techSet).sort().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.text = t;
        s2.appendChild(opt);
    });

    s1.addEventListener('change', () => {
        const dev = s1.value;
        const targetSel = document.getElementById('targetTechnique');
        targetSel.innerHTML = '';
        if(!dev || !matrix[dev]) return;
        
        const techs = matrix[dev].techniques || [];
        techs.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.text = t.name;
            targetSel.appendChild(opt);
        });
    });
}

function populateSearchSelect() {
}

function findPartners() {
    const sourceName = document.getElementById('sourceDev').value;
    const targetTech = document.getElementById('targetTechnique').value;
    
    if(!sourceName || !targetTech) return;
    
    const resDiv = document.getElementById('results-area');
    resDiv.innerHTML = `<div class="result-box">Looking for partners to isolate <b>${targetTech}</b> from <b>${sourceName}</b>...<br><br>
    <i>(Logic placeholder: To guarantee isolation, fuse with a partner that has identical technique pool or empty pool?)</i>
    </div>`;
}

function resetIsolationChecker() {
    document.getElementById('sourceDev').value = "";
    document.getElementById('targetTechnique').innerHTML = "<option>Select Source first</option>";
    document.getElementById('results-area').innerHTML = "";
}

function searchByTechnique() {
    const techName = document.getElementById('searchTechniqueSelect').value;
    const descDiv = document.getElementById('technique-search-description');
    const resDiv = document.getElementById('technique-results-area');
    
    if(!techName) return;

    let foundDesc = "";
    Object.values(matrix).some(d => {
        if(d.techniques) {
            const t = d.techniques.find(x => x.name === techName);
            if(t) { foundDesc = t.description; return true; }
        }
    });
    
    if(foundDesc) {
        descDiv.innerText = foundDesc;
        descDiv.style.display = "block";
    } else {
        descDiv.style.display = "none";
    }

    const owners = [];
    Object.keys(matrix).forEach(devName => {
        const dev = matrix[devName];
        if(dev.techniques && dev.techniques.find(t => t.name === techName)) {
            owners.push(devName);
        }
    });

    resDiv.innerHTML = owners.map(name => `
        <div class="card">
            <div class="card-title">${name}</div>
        </div>
    `).join('');
}

function resetTechniqueSearch() {
    document.getElementById('searchTechniqueSelect').value = "";
    document.getElementById('technique-search-description').style.display = "none";
    document.getElementById('technique-results-area').innerHTML = "";
}

function filterDeviants(typeFilter, btn) {
    if(typeFilter) {
        currentDeviantFilter = typeFilter;
        document.querySelectorAll('#deviant-filter-container .filter-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
    }
    
    const searchVal = document.getElementById('deviantSearchInput').value.toUpperCase();
    const container = document.getElementById('deviant-results-area');
    
    if(!searchVal && currentDeviantFilter === 'All') {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    const matches = Object.keys(matrix).filter(name => {
        const dev = matrix[name];
        const textMatch = name.toUpperCase().includes(searchVal);
        const typeMatch = (currentDeviantFilter === 'All') || (dev.type === currentDeviantFilter);
        return textMatch && typeMatch;
    });

    container.innerHTML = matches.map(name => {
        const dev = matrix[name];
        return `
        <div class="card">
            <div class="card-title">${name} <span style="font-size:0.7em; font-weight:normal; float:right;">${dev.type}</span></div>
            <div style="font-size:0.85rem; color:#ccc; margin-bottom:5px;">${dev.desc || ''}</div>
            <div class="tech-list">
                ${(dev.techniques || []).map(t => `<span>${t.name}</span>`).join('')}
            </div>
        </div>
        `;
    }).join('');
}

function resetDeviantSearch() {
    document.getElementById('deviantSearchInput').value = "";
    filterDeviants('All', document.querySelector('.btn-all'));
    document.getElementById('deviant-results-area').classList.add('hidden');
    closeCompareTool();
}

function toggleCompareTool() {
    const area = document.getElementById('compare-tool-area');
    area.classList.toggle('hidden');
}

function closeCompareTool() {
    document.getElementById('compare-tool-area').classList.add('hidden');
}

function populateCompareSelects() {
    const sA = document.getElementById('compareSelectA');
    const sB = document.getElementById('compareSelectB');
    const opts = Object.keys(matrix).sort().map(k => `<option value="${k}">${k}</option>`).join('');
    sA.innerHTML = '<option value="">Select A</option>' + opts;
    sB.innerHTML = '<option value="">Select B</option>' + opts;
}

function updateComparison() {
    const devA = document.getElementById('compareSelectA').value;
    const devB = document.getElementById('compareSelectB').value;
    const res = document.getElementById('compareResults');
    
    if(!devA || !devB) {
        res.innerHTML = "";
        return;
    }
    
    const dataA = matrix[devA];
    const dataB = matrix[devB];
    
    const techsA = (dataA.techniques || []).map(t => t.name);
    const techsB = (dataB.techniques || []).map(t => t.name);
    
    const shared = techsA.filter(t => techsB.includes(t));
    const uniqueA = techsA.filter(t => !techsB.includes(t));
    const uniqueB = techsB.filter(t => !techsA.includes(t));
    
    res.innerHTML = `
        <div style="text-align:center;">
            <h5>${devA}</h5>
            <div style="color:var(--highlight); font-size:0.9rem;">${dataA.type}</div>
            <hr style="border-color:#444;">
            <div style="font-size:0.85rem; text-align:left;">
                ${uniqueA.map(t => `<div>+ ${t}</div>`).join('')}
            </div>
        </div>
        <div style="text-align:center; border-left:1px solid #444; border-right:1px solid #444;">
            <h5>Shared</h5>
            <div style="font-size:0.85rem; color:var(--success); margin-top:10px;">
                ${shared.length > 0 ? shared.join('<br>') : '<span style="color:#666;">None</span>'}
            </div>
        </div>
        <div style="text-align:center;">
            <h5>${devB}</h5>
            <div style="color:var(--highlight); font-size:0.9rem;">${dataB.type}</div>
            <hr style="border-color:#444;">
            <div style="font-size:0.85rem; text-align:left;">
                ${uniqueB.map(t => `<div>+ ${t}</div>`).join('')}
            </div>
        </div>
    `;
}

function generateShareCode() {
    const target = document.getElementById('builderDevSelect').value;
    if(!target && desiredTraits.length === 0) return;
    
    const payload = {
        t: target,
        tr: desiredTraits
    };
    
    const jsonStr = JSON.stringify(payload);
    const b64 = btoa(jsonStr);
    
    document.getElementById('shareCodeInput').value = b64;
    navigator.clipboard.writeText(b64);
    
    const stat = document.getElementById('shareStatus');
    stat.innerText = "Copied!";
    setTimeout(() => stat.innerText = "", 2000);
}

function loadShareCode() {
    const code = document.getElementById('shareCodeInput').value.trim();
    if(!code) return;
    
    try {
        const jsonStr = atob(code);
        const payload = JSON.parse(jsonStr);
        
        if(payload.t) {
            document.getElementById('builderDevSelect').value = payload.t;
            onBuilderDevChange(); 
        }
        
        if(payload.tr && Array.isArray(payload.tr)) {
            desiredTraits = payload.tr;
            renderSelectedTraits();
        }
        
        generatePlan(); 
        
    } catch(e) {
        alert("Invalid Share Code");
        console.error(e);
    }
}

function openDataModal() {
    document.getElementById('dataSyncModal').classList.remove('hidden');
    checkDataSync(traits, matrix, arenaShops);
}
function closeDataModal() {
    document.getElementById('dataSyncModal').classList.add('hidden');
}

function checkDataSync(t, m, s) {
    const div = document.getElementById('dataSyncStatus');
    if(!div) return;
    
    div.innerHTML = `
        <p><b>Traits Loaded:</b> ${t.length}</p>
        <p><b>Deviations (Matrix):</b> ${Object.keys(m).length}</p>
        <p><b>Arena Shop Items:</b> ${s.length}</p>
        <hr style="border-color:#444;">
        <p style="font-size:0.8rem; color:#aaa;">Data verified.</p>
    `;
}
