let modInfo = {
	name: "运气树",
	id: "The-luck-Tree",
	author: "陈风就是浪",
	pointsName: "点数",
	modFiles: ["layers.js", "tree.js"],

	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal(0),
	offlineLimit: 1,
}

let VERSION = {
	num: "0.1",
	name: "The luck Tree",
}

let changelog = `<h1>更新日志</h1><br>
	<h3>v0.1</h3><br>
	    初版，一次想法的实现<br>
		如果有想法或bug提交，可以点击<a href="https://qm.qq.com/q/Ae8KXBQ4HS" target="_blank" style="color:#2196F3;text-decoration:underline">这里</a>加入QQ群交流<br>`

let winText = `你好……`

var doNotCallTheseFunctionsEveryTick = ["doReset", "buy", "onPurchase"]

function getStartPoints(){
    return new Decimal(modInfo.initialStartPoints)
}

function canGenPoints(){
	return true
}

function getPointGen() {
	return new Decimal(0)
}

function addedPlayerData() { return {
	totalResets: new Decimal(0),
	highestCritChain: 0,
	totalLuckEarned: new Decimal(0),
	totalBadLuckEarned: new Decimal(0),
}}

var displayThings = [
	function() {
		if (!player.f || !player.f.unlocked) return
		return "当前概率: <b>" + format(getCurrentPointProb().times(100)) + "%</b>"
	},
]

function isEndgame() {
	return player.points.gte(new Decimal(1e8))
}

var backgroundStyle = {}

function maxTickLength() {
	return(3600)
}

function fixOldSave(oldVersion){
}