/* ========================================================================
   ARCHIVED SLOT LOGIC
   Disabled Feature: Slot Filtering and Badges
   Date Archived: 2023-10-XX
   Reason: Data inconsistencies in slot assignments.

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
