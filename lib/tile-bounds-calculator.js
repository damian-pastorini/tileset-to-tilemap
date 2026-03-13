/**
 *
 * Reldens - TileBoundsCalculator
 *
 */

class TileBoundsCalculator
{
    static fromTiles(tiles)
    {
        let rows = tiles.map(t => t[0]);
        let cols = tiles.map(t => t[1]);
        return {
            minRow: Math.min(...rows),
            maxRow: Math.max(...rows),
            minCol: Math.min(...cols),
            maxCol: Math.max(...cols)
        };
    }
}

module.exports.TileBoundsCalculator = TileBoundsCalculator;
