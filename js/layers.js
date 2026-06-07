function getTickInterval() {
    let base = 5.0
    let amount = 0
    if (player.f && player.f.buyables && player.f.buyables[11]) {
        amount = player.f.buyables[11].toNumber()
    }
    if (amount <= 0) return base
    return base / (1 + 0.15 * amount)
}

function getCurrentPointProb() {
    let baseProb = 0.50
    let bonus = new Decimal(0)
    if (player.f && player.f.unlocked) {
        if (hasUpgrade("f", 11)) bonus = bonus.add(0.10)
        if (hasUpgrade("f", 12)) bonus = bonus.add(0.10)
        if (hasUpgrade("f", 13)) bonus = bonus.add(0.15)
        if (hasUpgrade("f", 14)) bonus = bonus.add(0.15)
    }
    let prob = new Decimal(baseProb).add(bonus)

    let luck = player.f ? player.f.points.toNumber() : 0
    let badLuck = player.f ? player.f.badLuck.toNumber() : 0
    let blFactor = hasUpgrade("f", 21) ? 0.5 : 1.0
    let netMod = 1 + (luck - badLuck * blFactor) * 0.02
    if (netMod < 0.05) netMod = 0.05
    if (netMod > 5.0) netMod = 5.0
    prob = prob.times(netMod)

    return prob.max(0.02)
}

function getLuckRangeFromPoints() {
    let pts = player.points.toNumber()
    if (pts < 1) return { min: 0, max: 2 }
    let luckMax = Math.floor(Math.pow(pts, 0.4))
    if (luckMax < 2) luckMax = 2
    if (hasUpgrade("f", 15)) luckMax += 1
    if (hasUpgrade("f", 16)) luckMax += 1
    if (hasUpgrade("f", 17)) luckMax += 2
    let luckMin = 0
    if (hasUpgrade("f", 16)) luckMin = 1
    if (hasUpgrade("f", 26)) {
        let bl = player.f ? player.f.badLuck.toNumber() : 0
        luckMax += Math.min(Math.floor(bl / 10), 10)
    }
    if (luckMin > luckMax) luckMin = luckMax
    return { min: luckMin, max: luckMax }
}

function getBadLuckRangeFromPoints() {
    let pts = player.points.toNumber()
    if (pts < 1) return { min: 0, max: 2 }
    let badMax = Math.floor(Math.pow(pts, 0.3) / 2)
    if (badMax < 2) badMax = 2
    return { min: 0, max: badMax }
}

addLayer("f", {
    name: "运数",
    symbol: "运",
    position: 0,
    color: "#FFD700",
    resource: "幸运值",
    row: 0,
    type: "custom",

    startData() { return {
        unlocked: true,
        points: new Decimal(0),
        best: new Decimal(0),
        total: new Decimal(0),
        badLuck: new Decimal(0),
        luckCharge: 0,
        buyables: { 11: new Decimal(0) },
        autoReset: false,
    }},

    baseResource: "点数",
    baseAmount() { return player.points },
    requires: new Decimal(1),

    getResetGain() {
        let r = getLuckRangeFromPoints()
        let luckGain = Math.floor(Math.random() * (r.max - r.min + 1)) + r.min
        let result = new Decimal(luckGain)

        let br = getBadLuckRangeFromPoints()
        let badGain = Math.floor(Math.random() * (br.max - br.min + 1)) + br.min
        this._badGainThisReset = badGain

        if (hasUpgrade(this.layer, 23)) {
            let reduced = Math.floor(badGain * 0.7)
            result = result.add((badGain - reduced) * 0.5)
            this._badGainThisReset = reduced
        }

        if (hasUpgrade(this.layer, 18)) {
            let critRate = hasUpgrade(this.layer, 19) ? 0.35 : 0.15
            let maxChain = hasUpgrade(this.layer, 19) ? 3 : 1
            if (hasUpgrade(this.layer, 25) && badGain >= 2) critRate += 0.30
            critRate = Math.max(critRate, 0)
            let chain = 0
            while (Math.random() < critRate && chain < maxChain) {
                chain++
                result = result.times(2)
            }
            if (chain > player.highestCritChain) player.highestCritChain = chain
        }

        return result.floor().max(0)
    },

    getNextAt() { return new Decimal(1) },
    canReset() { return player.points.gte(1) },

    prestigeButtonText() {
        let r = getLuckRangeFromPoints()
        let br = getBadLuckRangeFromPoints()
        let text = "消耗所有点数进行重置<br>"
        text += "基于当前点数 " + formatWhole(player.points) + "：<br>"
        text += "幸运值: <b>" + r.min + " ~ " + r.max + "</b>"
        text += "  |  厄运值: <b>" + br.min + " ~ " + br.max + "</b>"
        if (hasUpgrade(this.layer, 18)) {
            let cr = hasUpgrade(this.layer, 19) ? 0.35 : 0.15
            if (hasUpgrade(this.layer, 25)) cr += 0.30
            text += "<br>暴击率: <b>" + format(new Decimal(cr).times(100)) + "%</b>"
            if (hasUpgrade(this.layer, 19)) text += "（可连续，上限3次）"
        }
        return text
    },

    onPrestige(gain) {
        if (this._badGainThisReset && this._badGainThisReset > 0) {
            player[this.layer].badLuck = player[this.layer].badLuck.add(this._badGainThisReset)
            player.totalBadLuckEarned = player.totalBadLuckEarned.add(this._badGainThisReset)
        }
        player.totalResets = player.totalResets.add(1)
        player.totalLuckEarned = player.totalLuckEarned.add(gain)
        if (hasUpgrade(this.layer, 24) && this._badGainThisReset > 0 && Math.random() < 0.25) {
            player.points = player.points.add(1)
        }
        this._badGainThisReset = 0
    },

    resetDescription: "消耗点数获取",

    update(diff) {
        player[this.layer].luckCharge += diff
        let interval = getTickInterval()
        let prob = getCurrentPointProb().toNumber()
        while (player[this.layer].luckCharge >= interval) {
            player[this.layer].luckCharge -= interval
            if (Math.random() < prob) {
                player.points = player.points.add(1)
            }
        }
    },

    doReset(resettingLayer) {
        if (layers[resettingLayer].row > this.row) {
            layerDataReset(this.layer, ["best", "total", "badLuck"])
        }
    },

    autoUpgrade: false,

    upgrades: {
        11: {
            title: "风起",
            description: "点数生成概率 +10%",
            cost: new Decimal(2),
        },
        12: {
            title: "风涌",
            description: "点数生成概率 +10%",
            cost: new Decimal(5),
            unlocked() { return hasUpgrade(this.layer, 11) },
        },
        13: {
            title: "风卷",
            description: "点数生成概率 +15%",
            cost: new Decimal(15),
            unlocked() { return hasUpgrade(this.layer, 12) },
        },
        14: {
            title: "风爆",
            description: "点数生成概率 +15%",
            cost: new Decimal(30),
            unlocked() { return hasUpgrade(this.layer, 13) },
        },
        15: {
            title: "骰术入门",
            description: "重置幸运区间上限 +1",
            cost: new Decimal(3),
        },
        16: {
            title: "骰术进阶",
            description: "重置幸运区间上限 +1，下限锁定为 1",
            cost: new Decimal(8),
            unlocked() { return hasUpgrade(this.layer, 15) },
        },
        17: {
            title: "骰术精通",
            description: "重置幸运区间上限 +2",
            cost: new Decimal(20),
            unlocked() { return hasUpgrade(this.layer, 16) },
        },
        18: {
            title: "暴击初显",
            description: "重置时 15% 概率幸运值翻倍",
            cost: new Decimal(6),
            unlocked() { return hasUpgrade(this.layer, 15) },
        },
        19: {
            title: "暴击连发",
            description: "暴击率 +20%（累计 35%），可连续触发（上限3次）",
            cost: new Decimal(15),
            unlocked() { return hasUpgrade(this.layer, 18) },
        },

        21: {
            title: "厄运抗性",
            description: "厄运对概率的负面影响减半",
            currencyInternalName: "badLuck",
            currencyLayer: "f",
            currencyDisplayName: "厄运值",
            cost: new Decimal(3),
        },
        22: {
            title: "厄运洞察",
            description: "概率公式中的厄运权重再降 30%",
            currencyInternalName: "badLuck",
            currencyLayer: "f",
            currencyDisplayName: "厄运值",
            cost: new Decimal(6),
            unlocked() { return hasUpgrade(this.layer, 21) },
        },
        23: {
            title: "厄运转化",
            description: "重置时厄运获取×0.7，减少部分50%转为幸运值",
            currencyInternalName: "badLuck",
            currencyLayer: "f",
            currencyDisplayName: "厄运值",
            cost: new Decimal(12),
            unlocked() { return hasUpgrade(this.layer, 22) },
        },
        24: {
            title: "厄运共鸣",
            description: "获得厄运时 25% 概率额外生成 1 点数",
            currencyInternalName: "badLuck",
            currencyLayer: "f",
            currencyDisplayName: "厄运值",
            cost: new Decimal(10),
            unlocked() { return hasUpgrade(this.layer, 21) },
        },
        25: {
            title: "厄运爆发",
            description: "重置时若获得厄运 ≥ 2，本次暴击率 +30%",
            currencyInternalName: "badLuck",
            currencyLayer: "f",
            currencyDisplayName: "厄运值",
            cost: new Decimal(25),
            unlocked() { return hasUpgrade(this.layer, 23) && hasUpgrade(this.layer, 24) },
        },
        26: {
            title: "厄运循环",
            description: "每 10 厄运值，幸运区间上限 +1（上限+10）",
            currencyInternalName: "badLuck",
            currencyLayer: "f",
            currencyDisplayName: "厄运值",
            cost: new Decimal(40),
            unlocked() { return hasUpgrade(this.layer, 25) },
        },
    },

    buyables: {
        11: {
            title: "时运加速",
            cost(x) {
                if (x.gte(0)) return Decimal.pow(1.5, x).times(2).floor()
                return new Decimal(2)
            },
            effect(x) {
                let n = x.toNumber()
                return 5.0 / (1 + 0.15 * n)
            },
            display() {
                let amt = getBuyableAmount(this.layer, this.id)
                let cost = tmp[this.layer].buyables[this.id].cost
                let interval = getTickInterval()
                return "当前等级: <b>" + formatWhole(amt) + "</b><br>" +
                    "判定间隔: <b>" + format(new Decimal(interval)) + " 秒</b><br>" +
                    "下级 → 间隔: <b>" + format(new Decimal(5.0 / (1 + 0.15 * (amt.toNumber() + 1)))) + " 秒</b><br>" +
                    "升级花费: <b>" + format(cost) + " 幸运值</b>"
            },
            canAfford() {
                return player[this.layer].points.gte(tmp[this.layer].buyables[this.id].cost)
            },
            buy() {
                let cost = tmp[this.layer].buyables[this.id].cost
                player[this.layer].points = player[this.layer].points.sub(cost)
                setBuyableAmount(this.layer, this.id, getBuyableAmount(this.layer, this.id).add(1))
            },
        },
    },

    milestones: {
        0: {
            requirementDescription: "累计获得 10 幸运值",
            effectDescription: "解锁时运加速（Buyable）",
            done() { return player[this.layer].total.gte(10) },
        },
        1: {
            requirementDescription: "当前厄运 ≥ 20",
            effectDescription: "概率公式显示优化",
            done() { return player[this.layer].badLuck.gte(20) },
        },
        2: {
            requirementDescription: "累计厄运 ≥ 50",
            effectDescription: "厄运升级 B4、B5 可购买",
            done() { return player.totalBadLuckEarned.gte(50) },
        },
        3: {
            requirementDescription: "累计幸运+厄运 ≥ 200",
            effectDescription: "解锁自动重置",
            done() { return player.totalLuckEarned.add(player.totalBadLuckEarned).gte(200) },
            toggles: [["f", "autoReset"]],
        },
        4: {
            requirementDescription: "同时拥有 G4 和 B3",
            effectDescription: "解锁命运层提示",
            done() { return hasUpgrade(this.layer, 14) && hasUpgrade(this.layer, 23) },
        },
    },

    challenges: {
        11: {
            name: "点数大师",
            challengeDescription: "累积持有 1000 点数（非同时，全历史累计获得）",
            goalDescription: "累计获得点数 ≥ 1000",
            canComplete() { return player.totalLuckEarned.gte(50) },
            rewardDescription: "概率线效果 ×1.5",
        },
        12: {
            name: "厄运试炼",
            challengeDescription: "累计获得 100 厄运且不购买任何厄运升级",
            goalDescription: "累计厄运 ≥ 100 且 B 系列升级数 = 0",
            canComplete() {
                let bCount = 0
                for (let i = 21; i <= 26; i++) if (hasUpgrade(this.layer, i)) bCount++
                return player.totalBadLuckEarned.gte(100) && bCount === 0
            },
            rewardDescription: "厄运不再降低概率（仅保留幸运加成部分）",
        },
        13: {
            name: "暴击大师",
            challengeDescription: "最高暴击连击 ≥ 5",
            goalDescription: "历史最高暴击连续触发 ≥ 5 次",
            canComplete() { return player.highestCritChain >= 5 },
            rewardDescription: "暴击连续上限永久 +1",
        },
        14: {
            name: "加速狂人",
            challengeDescription: "时运加速等级 ≥ 10",
            goalDescription: "将时运加速升级到 10 级或以上",
            canComplete() { return getBuyableAmount(this.layer, 11).gte(10) },
            rewardDescription: "时运加速效果 +50%",
        },
    },

    automate() {
        if (player[this.layer].autoReset && canReset(this.layer)) {
            doReset(this.layer)
        }
    },

    tabFormat: {
        "运数": {
            content: [
                ["display-text", function() {
                    return "幸运值: <b>" + formatWhole(player.f.points) +
                           "</b>  |  厄运值: <b>" + formatWhole(player.f.badLuck) + "</b>"
                }],
                "main-display",
                "prestige-button",
                "resource-display",
                ["display-text", function() {
                    return "判定间隔: <b>" + format(new Decimal(getTickInterval())) +
                           " 秒</b>  |  有效概率: <b>" + format(getCurrentPointProb().times(100)) + "%</b>"
                }],
                "blank",
                "upgrades",
                "blank",
                ["buyables"],
                "blank",
                "milestones",
            ],
        },
        "挑战": {
            content: [
                ["display-text", "<h3>挑战</h3>"],
                "challenges",
            ],
        },
    },

    layerShown() { return true },

    hotkeys: [
        {key: "f", description: "F: 消耗点数重置获得幸运值", onPress(){if (canReset(this.layer)) doReset(this.layer)}},
    ],

    nodeStyle() {
        return { 'color': '#FFD700', 'text-shadow': '0px 0px 8px #FFD700', 'font-weight': 'bold' }
    },

    shouldNotify() { return player.points.gte(1) && canReset(this.layer) },
    glowColor: "#FFD700",

    tooltip() {
        return "幸运值: " + formatWhole(player[this.layer].points) +
               "<br>厄运值: " + formatWhole(player[this.layer].badLuck)
    },
})