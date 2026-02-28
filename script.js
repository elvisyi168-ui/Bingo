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
// 春節加碼：1~6星基本玩法獎金倍數全面翻倍
for (let i = 1; i <= 6; i++) {
    for (let hits in BONUS_PRIZE_NORMAL[i]) {
        if (BONUS_PRIZE_NORMAL[i][hits] > 0) {
            BONUS_PRIZE_NORMAL[i][hits] *= 2;
        }
    }
}

// 超級獎號、大小單雙於春節期間不加碼，維持原賠率
const BONUS_PRIZE_SUPER = JSON.parse(JSON.stringify(PRIZE_SUPER));

// Size/OddEven Payouts (Normal / Bonus)
const EXTRA_GAMES_PAYOUT = {
    normal: { "big": 150, "small": 150, "odd": 150, "even": 150, "tie": 107.5 },
    bonus:  { "big": 150, "small": 150, "odd": 150, "even": 150, "tie": 107.5 }
};

// 星數期望值與建議 (基於官方機率)
// 期望值 (EV): 每投注25元，長期下來平均回收的金額。越接近25代表越划算。
// 這裡數據採用估算常規台彩設定，並標註特色
const STAR_ANALYSIS = {
    10: { ev: 14.2,   badge: "極高風險", desc: "頭獎500萬！但整體回本率偏低，適合喜歡拚大獎的朋友。" },
    9:  { ev: 14.5,   badge: "高風險",   desc: "高風險高報酬，適合尋求刺激的進階玩家。" },
    8:  { ev: 15.1,   badge: "中高風險", desc: "頭獎50萬！難度與獎金取得平衡的選擇。" },
    7:  { ev: 15.6,   badge: "拼高賠率", desc: "獎金跳躍感最強的星數，中7或中6都非常迷人。" },
    6:  { ev: 16.2,   badge: "🔥最受歡迎", desc: "賠率甜蜜點！中3個就回本，中6個就有2萬5。連碰非常愛用！" },
    5:  { ev: 15.8,   badge: "相對平穩", desc: "最容易中滿星(5中5)的級距。" },
    4:  { ev: 16.4,   badge: "👑新手推薦", desc: "中2個保本，中大獎機率也不錯，投資報酬率(ROI)前三名！" },
    3:  { ev: 16.7,   badge: "🏆期望值最高", desc: "中2個就保本雙倍！純以前數學期望值來說，3星是最容易贏錢的王者。" },
    2:  { ev: 15.5,   badge: "保守投資", desc: "適合想穩定小贏的玩家。" },
    1:  { ev: 12.5,   badge: "純靠運氣", desc: "非黑即白，期望值最低，除非直覺極神否則不建議長壓。" },
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
    hitPeriodsCount: 1, // 模擬器：在這 N 期中，總共中了幾期
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
    hitPeriodsGroup: document.getElementById('hit-periods-group'),
    hitPeriodsDesc: document.getElementById('hit-periods-desc'),
    hitPeriodsRange: document.getElementById('hit-periods-count'),
    hitPeriodsDisplay: document.getElementById('hit-periods-display'),
    superHitContainer: document.getElementById('super-hit-container'),
    superHitToggle: document.getElementById('super-hit-toggle'),
    
    starRecommendationBadge: document.getElementById('star-recommendation-badge'),
    starEvDesc: document.getElementById('star-ev-desc'),
    
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

    elements.hitPeriodsRange.addEventListener('input', (e) => {
        state.hitPeriodsCount = parseInt(e.target.value);
        elements.hitPeriodsDisplay.textContent = state.hitPeriodsCount + " 期";
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
    
    // Update star recommendation
    const analysis = STAR_ANALYSIS[M];
    if (analysis) {
        elements.starRecommendationBadge.style.display = 'inline-block';
        elements.starRecommendationBadge.textContent = analysis.badge;
        // 依照等級換顏色 (紅=熱門/最高, 橘=推薦, 灰=其他)
        if (M === 3 || M === 6) {
            elements.starRecommendationBadge.style.backgroundColor = '#ef4444'; // Red
        } else if (M === 4 || M === 7) {
            elements.starRecommendationBadge.style.backgroundColor = '#f59e0b'; // Amber
        } else {
            elements.starRecommendationBadge.style.backgroundColor = '#64748b'; // Gray
        }
        
        // 說明文字，並在春節加碼且選1-6星時加上動態提示
        let descHtml = `💡 ${analysis.desc}<br>📊 單注期望值: 約 $${analysis.ev} (每投注$25)`;
        if (state.isBonusEvent && M <= 6) {
            descHtml += `<span style="color:#ef4444; font-weight:bold;"> → 🧨 春節翻倍中！期望值暴增！</span>`;
        }
        elements.starEvDesc.innerHTML = descHtml;
    }

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

    // Update Periods Simulation
    if (state.periodCount > 1) {
        elements.hitPeriodsDesc.style.display = 'block';
        elements.hitPeriodsGroup.style.display = 'flex';
        elements.hitPeriodsRange.max = state.periodCount;
        if (state.hitPeriodsCount > state.periodCount) {
            state.hitPeriodsCount = state.periodCount;
        }
        elements.hitPeriodsRange.value = state.hitPeriodsCount;
        elements.hitPeriodsDisplay.textContent = state.hitPeriodsCount + " 期";
    } else {
        elements.hitPeriodsDesc.style.display = 'none';
        elements.hitPeriodsGroup.style.display = 'none';
        state.hitPeriodsCount = 1;
        elements.hitPeriodsRange.value = 1;
        elements.hitPeriodsDisplay.textContent = "1 期";
    }
    
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
    
    // totalPrizeMoney 將代表: "這些期數內，我所勾選的命中情況出現了 hitPeriodsCount 次" 的總獎金
    let totalPrizeMoney = 0; 
    let tableHTML = `
        <table class="payout-table">
            <thead>
                <tr>
                    <th>命中情境</th>
                    <th>命中注數</th>
                    <th>單注獎金</th>
                    <th>總獎金 (已乘期數)</th>
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
        
        for (let j = M; j >= 0; j--) {
            const hitCombinations = combinations(K, j) * combinations(N - K, M - j);
            
            if (hitCombinations > 0 && prizeLevel[j] !== undefined) {
                hasAnyWinner = true;
                const singlePrize = prizeLevel[j];
                // 獎金 = (注數 * 該獎級表原基底額 * 下注倍數) [此處先算"單期"獎金]
                const rowSinglePeriodTotal = hitCombinations * singlePrize * state.multiplier; 
                const totalForTargetPeriods = rowSinglePeriodTotal * state.hitPeriodsCount;
                totalPrizeMoney += totalForTargetPeriods;
                
                tableHTML += `
                    <tr class="${singlePrize > state.baseCost ? 'row-highlight' : ''}">
                        <td>連碰中 ${j} 號</td>
                        <td>${formatMoney(hitCombinations)} 注 x ${state.hitPeriodsCount}期</td>
                        <td>$${formatMoney(singlePrize)}</td>
                        <td>$${formatMoney(totalForTargetPeriods)}</td>
                    </tr>
                `;
            }
        }
    }
    
    // 2. Calculate Extra Games Payout
    if (state.extraGames.length > 0) {
        hasAnyWinner = true;
        const extraTable = state.isBonusEvent ? EXTRA_GAMES_PAYOUT.bonus : EXTRA_GAMES_PAYOUT.normal;
        
        const counts = {};
        state.extraGames.forEach(g => { counts[g.val] = (counts[g.val] || 0) + 1; });
        
        Object.entries(counts).forEach(([val, count]) => {
            const singlePrize = extraTable[val] || 150;
            const singleTotalMultiplier = count * state.multiplier; 
            const rowSinglePeriodTotal = singleTotalMultiplier * singlePrize;
            const totalForTargetPeriods = rowSinglePeriodTotal * state.hitPeriodsCount;
            totalPrizeMoney += totalForTargetPeriods;
            
            tableHTML += `
                <tr>
                    <td>猜中 ${transExtraName(val)} (全對模擬)</td>
                    <td>${singleTotalMultiplier} 單位 x ${state.hitPeriodsCount}期</td>
                    <td>$${formatMoney(singlePrize)}</td>
                    <td>$${formatMoney(totalForTargetPeriods)}</td>
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

    elements.totalPayout.innerHTML = `
        <div style="font-size: 0.9em;">合計中 ${state.hitPeriodsCount} 期: NT$ ${formatMoney(totalPrizeMoney)}</div>
    `;
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
