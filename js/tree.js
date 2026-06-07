var layoutInfo = {
    startTab: "f",
    startNavTab: "tree-tab",
	showTree: true,
}

addNode("blank", {
    layerShown: "ghost",
})


addLayer("tree-tab", {
    tabFormat: [["tree", function() {return (layoutInfo.treeLayout ? layoutInfo.treeLayout : TREE_LAYERS)}]],
    previousTab: "",
    leftTab: true,
})