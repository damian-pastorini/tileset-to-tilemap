/**
 *
 * Reldens - MapFormatter
 *
 */

const { sc } = require('@reldens/utils');

class MapFormatter
{
    static formatMap(map)
    {
        return sc.toJsonString(map, null, 4).replace(
            /("data":\s*\[)(?:\n\s*)([\s\S]*?)(\n\s*\])/g,
            (match, start, dataArray, end) => {
                return start + '\n' + dataArray.replace(/\s+/g, '') + end;
            }
        );
    }

    static formatElementsConfig(tilesets)
    {
        let singles = [];
        let marker = '@@s@@';
        return sc.toJsonString(tilesets, (key, value) => {
            if('filteredTiles' !== key && 'tiles' !== key){
                return value;
            }
            if(!sc.isArray(value)){
                return value;
            }
            singles.push(sc.toJsonString(value));
            return marker+(singles.length - 1);
        }, 4).replace(new RegExp('"'+marker+'(\\d+)"', 'g'), (match, idx) => singles[Number(idx)]);
    }
}

module.exports.MapFormatter = MapFormatter;
