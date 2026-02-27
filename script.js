// --- DATA TABLES ---
// 台彩賓果官方獎金表 (正常版 - 一般獎金) [星數][猜中號碼數] = 單注獎金
const PRIZE_NORMAL = {
    10: { 10: 5000000, 9: 250000, 8: 25000, 7: 2500, 6: 250, 5: 25, 0: 25 },
    9: { 9: 1000000, 8: 100000, 7: 3000, 6: 500, 5: 100, 4: 25, 0: 25 },
    8: { 8: 500000, 7: 20000, 6: 1000, 5: 200, 4: 25, 0: 25 },
    7: { 7: 80000, 6: 3000, 5: 300, 4: 50, 3: 25 },
    6: { 6: 25000, 5: 1000, 4: 200, 3: 25 },
    5: { 5: 7500, 4: 500, 3: 50 },
    4: { 4: 1000, 3: 100, 2: 25 },
    3: { 3: 500, 2: 50 },
    2: { 2: 75, 1: 25 },
    1: { 1: 50 }
};

// 中超級獎號時的獎金表 (一般獎號為0元的情境有些依然沒錢)
const PRIZE_SUPER = {
    10: { 10: 12500000, 9: 625000, 8: 62500, 7: 6250, 6: 625, 5: 62, 0: 62 },
    9: { 9: 2500000, 8: 250000, 7: 7500, 6: 1250, 5: 250, 4: 62, 0: 62 },
    8: { 8: 1250000, 7: 50000, 6: 2500, 5: 500, 4: 62, 0: 62 },
    7: { 7: 200000, 6: 7500, 5: 750, 4: 125, 3: 62 },
    6: { 6: 62500, 5: 2500, 4: 500, 3: 62 },
    5: { 5: 18750, 4: 1250, 3: 125 },
    4: { 4: 2500, 3: 250, 2: 62 },
    3: { 3: 1250, 2: 125 },
    2: { 2: 187, 1: 62 },
    1: { 1: 150 } // 當1星中特別號時的獎金
};

// 春節加碼版獎金表 (模擬加碼提升)
const BONUS_PRIZE_NORMAL = JSON.parse(JSON.stringify(PRIZE_NORMAL));
// Example bonus logic: 1~3星獎金提升
BONUS_PRIZE_NORMAL[1][1] = 60; 
BONUS_PRIZE_NORMAL[2][2] = 100; BONUS_PRIZE_NORMAL[2][1] = 30;
BONUS_PRIZE_NORMAL[3][3] = 650; BONUS_PRIZE_NORMAL[3][2] = 65;
BONUS_PRIZE_NORMAL[6][6] = 30000; // 6星大躍進

const BONUS_PRIZE_SUPER = JSON.parse(JSON.stringify(PRIZE_SUPER));
BONUS_PRIZE_SUPER[1][1] = 200;
BONUS_PRIZE_SUPER[2][2] = 250;
BONUS_PRIZE_SUPER[3][3] = 1625;
BONUS_PRIZE_SUPER[6][6] = 75000;

// Size/OddEven Payouts (Normal / Bonus)
const EXTRA_GAMES_PAYOUT = {
    normal: { "big": 150, "small": 150, "odd": 150, "even": 150, "tie": 107.5 },
    bonus:  { "big": 175, "small": 175, "odd": 175, "even": 175, "tie": 125 }
};

// --- STATE ---
const state = {
    selectedNumbers: new Set(),
    extraGames: [], // [{type: 'bs', val: 'big', cost: 25}, ...]
    
    starLevel: 6,
    baseCost: 25,
    multiplier: 1,      // 1-50倍
    periodCount: 1,     // 連續期數 1-10期
    isSuperNum: false,  // 超級獎號開關
    isBonusEvent: false,// 春節加碼開關
    
    combinations: 0,
    baseGameCost: 0,
    extraGameCost: 0,
    totalCost: 0,
    
    hitCount: 0,
    isSuperHit: false   // 模擬器: 是否包含命中超級號碼
};

// --- DOM ELEMENTS ---
const elements = {
    numberGrid: document.getElementById('number-grid'),
    selectedCount: document.getElementById('selected-count'),
    btnClear: document.getElementById('btn-clear'),
    
    starSelect: document.getElementById('star-select'),
    multiplierSelect: document.getElementById('multiplier-select'),
    periodSelect: document.getElementById('period-select'),
    superNumToggle: document.getElementById('super-num-toggle'),
    bonusToggle: document.getElementById('bonus-toggle'),
    bonusIndicator: document.getElementById('bonus-indicator'),
    
    bsGroup: document.getElementById('bs-group'),
    oeGroup: document.getElementById('oe-group'),
    extraList: document.getElementById('extra-games-list'),
    
    totalCombinations: document.getElementById('total-combinations'),
    btnShowCombinations: document.getElementById('btn-show-combinations'),
    combinationsModal: document.getElementById('combinations-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    comboList: document.getElementById('combo-list'),
    
    totalCost: document.getElementById('total-cost'),
    costBreakdown: document.getElementById('cost-breakdown'),
    errorMsg: document.getElementById('error-msg'),
    
    simulationBlock: document.getElementById('simulation-block'),
    hitCountRange: document.getElementById('hit-count'),
    hitCountDisplay: document.getElementById('hit-count-display'),
    superHitContainer: document.getElementById('super-hit-container'),
    superHitToggle: document.getElementById('super-hit-toggle'),
    
    totalPayout: document.getElementById('total-payout'),
    payoutDetails: document.getElementById('payout-details')
};

// --- MATH HELPERS ---
function combinations(n, m) {
    if (m < 0 || m > n) return 0;
    if (m === 0 || m === n) return 1;
    if (m > n / 2) m = n - m;
    let result = 1;
    for (let i = 1; i <= m; i++) {
        result *= n - (m - i);
        result /= i;
    }
    return Math.round(result);
}

// 產生所有組合的遞迴演算法
function generateCombinations(arr, m) {
    const result = [];
    
    function combine(start, currentCombo) {
        if (currentCombo.length === m) {
            result.push([...currentCombo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            currentCombo.push(arr[i]);
            combine(i + 1, currentCombo);
            currentCombo.pop();
        }
    }
    
    combine(0, []);
    return result;
}

function formatMoney(num) { return num.toLocaleString('en-US'); }
function transExtraName(val) {
    const map = { 'big': '大', 'small': '小', 'odd': '單', 'even': '雙', 'tie': '和' };
    return map[val] || val;
}

// --- LOGIC ---
function init() {
    renderGrid();
    setupEventListeners();
    updateUI();
}

function renderGrid() {
    elements.numberGrid.innerHTML = '';
    for (let i = 1; i <= 80; i++) {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.textContent = i;
        btn.dataset.number = i;
        btn.addEventListener('click', () => toggleNumber(i, btn));
        elements.numberGrid.appendChild(btn);
    }
}

function toggleNumber(num, btnElement) {
    if (state.selectedNumbers.has(num)) {
        state.selectedNumbers.delete(num);
        btnElement.classList.remove('selected');
    } else {
        if(state.selectedNumbers.size >= 20) {
            alert("選擇超過20個號碼的連碰組合太大，為確保流暢運算，請勿超過20個號碼。");
            return;
        }
        state.selectedNumbers.add(num);
        btnElement.classList.add('selected');
    }
    updateUI();
}

function handleExtraGameClick(btn) {
    const type = btn.dataset.type;
    const val = btn.dataset.val;
    // Add to extra games array
    state.extraGames.push({ type, val, baseCost: 25 });
    
    // Add visual bounce
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 150);
    
    updateUI();
}

function setupEventListeners() {
    elements.btnClear.addEventListener('click', () => {
        state.selectedNumbers.clear();
        state.extraGames = [];
        document.querySelectorAll('.num-btn.selected').forEach(btn => btn.classList.remove('selected'));
        updateUI();
    });

    elements.starSelect.addEventListener('change', (e) => { state.starLevel = parseInt(e.target.value); updateUI(); });
    elements.multiplierSelect.addEventListener('change', (e) => { state.multiplier = parseInt(e.target.value); updateUI(); });
    elements.periodSelect.addEventListener('change', (e) => { state.periodCount = parseInt(e.target.value); updateUI(); });
    
    elements.superNumToggle.addEventListener('change', (e) => {
        state.isSuperNum = e.target.checked;
        if(state.isSuperNum) {
            elements.superHitContainer.style.display = 'block';
        } else {
            elements.superHitContainer.style.display = 'none';
            elements.superHitToggle.checked = false;
            state.isSuperHit = false;
        }
        updateUI();
    });
    
    elements.bonusToggle.addEventListener('change', (e) => {
        state.isBonusEvent = e.target.checked;
        if(state.isBonusEvent) {
            elements.bonusIndicator.classList.remove('hidden');
            createConfetti();
        } else {
            elements.bonusIndicator.classList.add('hidden');
        }
        updateUI();
    });

    // Extra games
    document.querySelectorAll('.btn-pill').forEach(btn => {
        btn.addEventListener('click', () => handleExtraGameClick(btn));
    });

    // Simulation
    elements.hitCountRange.addEventListener('input', (e) => {
        state.hitCount = parseInt(e.target.value);
        elements.hitCountDisplay.textContent = state.hitCount;
        calculatePayout();
    });
    
    elements.superHitToggle.addEventListener('change', (e) => {
        state.isSuperHit = e.target.checked;
        calculatePayout();
    });

    // Modal Events
    elements.btnShowCombinations.addEventListener('click', showCombinationsModal);
    elements.btnCloseModal.addEventListener('click', () => elements.combinationsModal.style.display = 'none');
    elements.combinationsModal.addEventListener('click', (e) => {
        if (e.target === elements.combinationsModal) {
            elements.combinationsModal.style.display = 'none';
        }
    });
}

function showCombinationsModal() {
    const nums = Array.from(state.selectedNumbers).sort((a,b) => a-b);
    const m = state.starLevel;
    
    if (nums.length < m || state.combinations > 10000) {
        alert(state.combinations > 10000 ? "組合數過多 (超過一萬組)，請減少選擇的號碼以免瀏覽器當機。" : "號碼無效。");
        return;
    }

    elements.comboList.innerHTML = '';
    
    // 如果組合組數達到破千，稍微提示正在計算
    const combos = generateCombinations(nums, m);
    
    // Populate list
    const fragment = document.createDocumentFragment();
    combos.forEach(combo => {
        const li = document.createElement('li');
        // format each number in the combo
        li.innerHTML = combo.map(n => `<span class="combo-num">${n.toString().padStart(2, '0')}</span>`).join(' ');
        fragment.appendChild(li);
    });
    
    elements.comboList.appendChild(fragment);
    elements.combinationsModal.style.display = 'flex';
}

function updateUI() {
    const N = state.selectedNumbers.size;
    const M = state.starLevel;
    
    // Update top badge
    elements.selectedCount.textContent = `已選: ${N} / 20`;
    
    // Update Extra games list
    if (state.extraGames.length === 0) {
        elements.extraList.textContent = '無';
    } else {
        // Group and count
        const counts = {};
        state.extraGames.forEach(g => { counts[g.val] = (counts[g.val] || 0) + 1; });
        const text = Object.entries(counts).map(([k,v]) => `${transExtraName(k)}x${v}`).join(', ');
        elements.extraList.textContent = text;
    }

    // Extra game cost calculation: (注數 x $25 x 倍數) x 期數
    state.extraGameCost = state.extraGames.length * 25 * state.multiplier * state.periodCount;

    // Determine Base Game Cost mapping
    const singleBetCost = state.baseCost * (state.isSuperNum ? 2 : 1);
    
    // Update Simulation Range Max based on selected numbers
    elements.hitCountRange.max = N;
    if (state.hitCount > N) {
        state.hitCount = N;
        elements.hitCountRange.value = N;
    }
    elements.hitCountDisplay.textContent = state.hitCount;
    
    // Check Validity for base game
    if (N > 0 && N < M) {
        elements.totalCombinations.textContent = '0';
        elements.btnShowCombinations.style.display = 'none';
        elements.errorMsg.style.display = 'block';
        elements.errorMsg.textContent = `連碰錯誤：請至少選擇 ${M} 個號碼才能進行 ${M} 星連碰計算！`;
        elements.simulationBlock.classList.remove('active');
        state.combinations = 0;
        state.baseGameCost = 0;
    } else if (N === 0) {
        elements.errorMsg.style.display = 'none';
        elements.btnShowCombinations.style.display = 'none';
        elements.simulationBlock.classList.remove('active');
        state.combinations = 0;
        state.baseGameCost = 0;
        elements.totalCombinations.textContent = '0';
    } else {
        // Valid Base Selection
        elements.errorMsg.style.display = 'none';
        elements.simulationBlock.classList.add('active');
        
        state.combinations = combinations(N, M);
        
        // Toggle view combinations button
        if (state.combinations > 0) {
            elements.btnShowCombinations.style.display = 'block';
            if (state.combinations > 5000) {
                elements.btnShowCombinations.textContent = `查看明細 (資料量大，載入需時)`;
            } else {
                elements.btnShowCombinations.textContent = `查看 ${state.combinations} 組明細`;
            }
        } else {
            elements.btnShowCombinations.style.display = 'none';
        }

        // Base Cost: 組合數 x 單注金 x 倍數 x 期數
        state.baseGameCost = state.combinations * singleBetCost * state.multiplier * state.periodCount;
        elements.totalCombinations.textContent = formatMoney(state.combinations);
    }
    
    // Total Cost
    state.totalCost = state.baseGameCost + state.extraGameCost;
    elements.totalCost.textContent = formatMoney(state.totalCost);
    elements.costBreakdown.textContent = `基本(包含倍數): $${formatMoney(state.baseGameCost)} | 額外玩法: $${formatMoney(state.extraGameCost)}`;
    
    calculatePayout();
}

function calculatePayout() {
    const N = state.selectedNumbers.size;
    const M = state.starLevel;
    const K = state.hitCount;
    const isSuperHit = state.isSuperHit; // Only true if super num toggled AND super hit toggled
    
    let totalPrizeMoney = 0;
    let tableHTML = `
        <table class="payout-table">
            <thead>
                <tr>
                    <th>命中情境</th>
                    <th>命中注數</th>
                    <th>單注獎金</th>
                    <th>小計金額 (含倍數)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let hasAnyWinner = false;

    // 1. Calculate Base Game Payout
    if (state.combinations > 0) {
        // Select Prize Table
        let activeTable;
        if (state.isBonusEvent) {
            activeTable = state.isSuperNum ? (isSuperHit ? BONUS_PRIZE_SUPER : BONUS_PRIZE_NORMAL) : BONUS_PRIZE_NORMAL;
        } else {
            activeTable = state.isSuperNum ? (isSuperHit ? PRIZE_SUPER : PRIZE_NORMAL) : PRIZE_NORMAL;
        }

        const prizeLevel = activeTable[M];
        
        // 算出 N 個中，有 K 個是獎號。如果要精算「其中包含 1 個超級獎號」的機率分佈會非常複雜。
        // 為直覺模擬，我們給定的條件是：若您勾選「包含超級獎號」，我們直接將該情境下的單注獎金套用該超級表。（即假設中獎組合都沾到超獎的光，或純體驗派彩額外威力）。
        // 超幾何分佈 C(命中數, 中幾號) * C(不中數, 星數-中幾號)
        for (let j = M; j >= 0; j--) {
            const hitCombinations = combinations(K, j) * combinations(N - K, M - j);
            
            if (hitCombinations > 0 && prizeLevel[j] !== undefined) {
                hasAnyWinner = true;
                const singlePrize = prizeLevel[j];
                // 獎金 = (注數 * 該獎級表原基底額 * 下注倍數) x 期數
                // 注意：派彩模擬為「如果在這 N 期中都中了同樣的狀況」的預估理論獎金。
                const rowTotal = hitCombinations * singlePrize * state.multiplier * state.periodCount; 
                totalPrizeMoney += rowTotal;
                
                tableHTML += `
                    <tr class="${singlePrize > state.baseCost ? 'row-highlight' : ''}">
                        <td>連碰中 ${j} 號</td>
                        <td>${formatMoney(hitCombinations)} 注 x ${state.periodCount}期</td>
                        <td>$${formatMoney(singlePrize)}</td>
                        <td>$${formatMoney(rowTotal)}</td>
                    </tr>
                `;
            }
        }
    }
    
    // 2. Calculate Extra Games Payout (Assuming the user guessed CORRECTLY for all clicked extra games for simulation!)
    if (state.extraGames.length > 0) {
        hasAnyWinner = true;
        const extraTable = state.isBonusEvent ? EXTRA_GAMES_PAYOUT.bonus : EXTRA_GAMES_PAYOUT.normal;
        
        // Aggregate
        const counts = {};
        state.extraGames.forEach(g => { counts[g.val] = (counts[g.val] || 0) + 1; });
        
        Object.entries(counts).forEach(([val, count]) => {
            const singlePrize = extraTable[val] || 150;
            // 單注總倍數 = 次數 * 下注倍數 * 期數
            const singleTotalMultiplier = count * state.multiplier * state.periodCount; 
            const rowTotal = singleTotalMultiplier * singlePrize;
            totalPrizeMoney += rowTotal;
            
            tableHTML += `
                <tr>
                    <td>猜中 ${transExtraName(val)} (全對模擬)</td>
                    <td>${singleTotalMultiplier} 單位 (含期數)</td>
                    <td>$${formatMoney(singlePrize)}</td>
                    <td>$${formatMoney(rowTotal)}</td>
                </tr>
            `;
        });
    }
    
    if (!hasAnyWinner) {
        tableHTML += `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">目前沒有任何派彩情境。</td></tr>`;
    }
    
    tableHTML += `</tbody></table>`;
    
    // Update Total Result Visuals
    if (totalPrizeMoney > state.totalCost && state.totalCost > 0) {
        elements.totalPayout.className = 'value success';
    } else if (totalPrizeMoney > 0) {
        elements.totalPayout.className = 'value warning';
    } else {
        elements.totalPayout.className = 'value';
    }

    elements.totalPayout.textContent = `NT$ ${formatMoney(totalPrizeMoney)}`;
    elements.payoutDetails.innerHTML = tableHTML;
}

// 簡單的彩帶特效
function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#FFD700', '#FF4500', '#FF1493', '#00FF00', '#1E90FF'];
    
    for(let i=0; i<50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.top = '-10px';
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        const duration = Math.random() * 2 + 1;
        confetti.style.transition = `top ${duration}s linear, transform ${duration}s ease-in-out`;
        
        container.appendChild(confetti);
        
        // Trigger animation
        setTimeout(() => {
            confetti.style.top = window.innerHeight + 'px';
            confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
        }, 10);
    }
    
    // Cleanup
    setTimeout(() => { container.innerHTML = ''; }, 3000);
}

// Boot
document.addEventListener('DOMContentLoaded', init);
