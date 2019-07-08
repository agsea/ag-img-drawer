/**
 * 自定义多边形类
 * */

export default function AgMultiPolygon() {
    this.type = 'ag-multi-polygon';
    this.polygons = [];

    this.add = function (object) {
        this.polygons.push(object);
    };

    this.clear = function () {
        this.polygons = [];
    };

    this.isType = function (type) {
        return this.type === type;
    };
}
