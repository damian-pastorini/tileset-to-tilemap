/**
 *
 * Reldens - TileGroupMerger
 *
 */

class TileGroupMerger
{
    findRoot(parent, i)
    {
        if(parent[i] !== i){
            parent[i] = this.findRoot(parent, parent[i]);
        }
        return parent[i];
    }

    unionGroups(parent, a, b)
    {
        let ra = this.findRoot(parent, a);
        let rb = this.findRoot(parent, b);
        if(ra !== rb){
            parent[ra] = rb;
        }
    }

    buildTileOwnerForGroup(tileOwner, parent, group, groupIndex)
    {
        for(let tile of group){
            let key = tile[0]+','+tile[1];
            if(tileOwner.has(key)){
                this.unionGroups(parent, groupIndex, tileOwner.get(key));
                continue;
            }
            tileOwner.set(key, groupIndex);
        }
    }

    addGroupToMergedSet(tileSet, group)
    {
        for(let tile of group){
            tileSet.add(tile[0]+','+tile[1]);
        }
    }

    tileSetToArray(tileSet)
    {
        let tiles = [];
        for(let k of tileSet){
            let parts = k.split(',');
            tiles.push([Number(parts[0]), Number(parts[1])]);
        }
        return tiles;
    }

    merge(groups)
    {
        let parent = [];
        let tileOwner = new Map();
        for(let i = 0; i < groups.length; i++){
            parent.push(i);
            this.buildTileOwnerForGroup(tileOwner, parent, groups[i], i);
        }
        let merged = new Map();
        for(let i = 0; i < groups.length; i++){
            let root = this.findRoot(parent, i);
            if(!merged.has(root)){
                merged.set(root, new Set());
            }
            this.addGroupToMergedSet(merged.get(root), groups[i]);
        }
        let result = [];
        for(let tileSet of merged.values()){
            result.push(this.tileSetToArray(tileSet));
        }
        return result;
    }
}

module.exports.TileGroupMerger = TileGroupMerger;
