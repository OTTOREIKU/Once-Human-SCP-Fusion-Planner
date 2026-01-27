// === TEAM STATE ===
let isTeamMode = false;
let teamData = [null, null, null]; 
let activeTeamSlot = 0;

function initTeamMode(preserveData = false) {
    isTeamMode = true;
    if (!preserveData) saveCurrentBuildToSlot(0);
    activeTeamSlot = 0;
    const container = document.getElementById('team-ui-area');
    if (container) container.classList.remove('hidden');

    document.getElementById('btnCreateTeam').classList.add('hidden');
    document.getElementById('btnResetTeam').classList.remove('hidden');
    document.getElementById('btnDeleteTeam').classList.remove('hidden');
    document.getElementById('team-slots-container').classList.remove('hidden');
    renderTeamSlots();
}

function deleteTeam() {
    isTeamMode = false;
    teamData = [null, null, null];
    activeTeamSlot = 0;
    
    document.getElementById('btnCreateTeam').classList.remove('hidden');
    document.getElementById('btnResetTeam').classList.add('hidden');
    document.getElementById('btnDeleteTeam').classList.add('hidden');
    document.getElementById('team-slots-container').classList.add('hidden');
    document.getElementById('team-slots-container').innerHTML = "";
}

function resetTeamData() {
    teamData = [null, null, null];
    activeTeamSlot = 0;
    if (typeof resetBuilder === "function") resetBuilder(true); 
    renderTeamSlots();
}

function createNewSlot(index) {
    if (teamData[activeTeamSlot] !== null) saveCurrentBuildToSlot(activeTeamSlot);
    activeTeamSlot = index;
    if (typeof resetBuilder === "function") resetBuilder(true); 
    renderTeamSlots();
}

function swapTeamSlot(index) {
    if (index === activeTeamSlot) return; 
    if (teamData[activeTeamSlot] !== null) saveCurrentBuildToSlot(activeTeamSlot);
    
    activeTeamSlot = index;
    const data = teamData[index];
    
    if (data) restoreBuildFromData(data);
    else if (typeof resetBuilder === "function") resetBuilder(true);
    
    renderTeamSlots();
    
    const resultsBox = document.getElementById('builderResults');
    const builderBox = document.getElementById('builderDevSelect');
    if (data && resultsBox && resultsBox.innerHTML.trim() !== "") resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (builderBox) builderBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteTeamMember(e, index) {
    e.stopPropagation(); 
    teamData[index] = null;
    if (index === activeTeamSlot && typeof resetBuilder === "function") resetBuilder(true);
    renderTeamSlots();
}

function saveCurrentBuildToSlot(slotIndex) {
    const target = document.getElementById('builderDevSelect').value;
    const skills = Array.from(document.querySelectorAll('#builderCheckboxes input:checked')).map(cb => cb.value);
    const hasTraits = (typeof userSelectedTraits !== 'undefined' && userSelectedTraits.length > 0);

    if (!target || target === "Loading..." || target === "" || (skills.length === 0 && !hasTraits)) {
        teamData[slotIndex] = null;
        return;
    }
    const traitData = userSelectedTraits.map(t => ({n: t.name, s: t.source}));
    teamData[slotIndex] = { d: target, s: skills, t: traitData };
}

function restoreBuildFromData(payload) {
    const devSelect = document.getElementById('builderDevSelect');
    if (payload.d) {
        devSelect.value = payload.d;
        if (typeof updateBuilderTechniques === "function") updateBuilderTechniques(); 
    }
    if (payload.s && Array.isArray(payload.s)) {
        setTimeout(() => {
            const boxes = document.querySelectorAll('#builderCheckboxes input');
            boxes.forEach(box => { box.checked = payload.s.includes(box.value); });
        }, 0);
    }
    if (payload.t && Array.isArray(payload.t)) {
        userSelectedTraits.length = 0; 
        payload.t.forEach(savedTrait => {
            const fullTrait = traits.find(t => t.name === savedTrait.n && t.source === savedTrait.s);
            if(fullTrait) userSelectedTraits.push(fullTrait);
        });
        if (typeof renderSelectedTraits === "function") renderSelectedTraits();
    }
    setTimeout(() => { if (typeof generatePlan === "function") generatePlan(); }, 50);
}

function renderTeamSlots() {
    const container = document.getElementById('team-slots-container');
    container.innerHTML = "";
    
    for (let i = 0; i < 3; i++) {
        const data = teamData[i];
        const isActive = (i === activeTeamSlot);
        const div = document.createElement('div');
        
        if (data) {
            // Apply accents
            const techTags = data.s.map(tech => `<span class="uni-tag tag-tech">${tech}</span>`).join('');
            const traitTags = data.t.map(trait => `<span class="uni-tag tag-trait">${trait.n}</span>`).join('');

            div.className = `team-slot ${isActive ? 'active-slot' : ''}`;
            
            div.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${data.d}</span>
                    <button class="btn-close" onclick="deleteTeamMember(event, ${i})">✕</button>
                </div>
                <div class="tag-list">${techTags}</div>
                ${traitTags ? '<div class="card-divider"></div><div class="tag-list">' + traitTags + '</div>' : ''}
            `;
            div.onclick = () => swapTeamSlot(i);
        } else {
            div.className = `team-slot empty-slot ${isActive ? 'active-slot' : ''}`;
            div.innerHTML = `<span style="font-size:2rem; font-weight:bold;">+</span>`;
            div.onclick = () => createNewSlot(i);
        }
        
        container.appendChild(div);
    }
}
