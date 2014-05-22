/**
 * A layer that will display indoor data
 *
 * addData takes a GeoJSON feature collection, each feature must have a level
 * property that indicates the level.
 *
 * getLevels can be called to get the array of levels that are present.
 */
L.Indoor = L.Class.extend({

    options: {
        getLevel: function(feature) {
            return feature.properties.level;
        }
    },

    initialize: function(data, options) {
        L.setOptions(this, options);
        options = this.options;

        var layers = this._layers = {};
        this._map = null;

        if ("level" in this.options) {
            this._level = this.options.level;
        } else {
            this._level = null;
        }

        if ("onEachFeature" in this.options)
            var onEachFeature = this.options.onEachFeature;

        this.options.onEachFeature = function(feature, layer) {

            if (onEachFeature)
                onEachFeature(feature, layer);

            if ("markerForFeature" in options) {
                var marker = options.markerForFeature(feature);
                if (typeof(marker) !== 'undefined') {
                    marker.on('click', function(e) {
                        layer.fire('click', e);
                    });

                    layers[feature.properties.level].addLayer(marker);
                }
            }
        };

        this.addData(data);
    },
    addTo: function (map) {
        map.addLayer(this);
        return this;
    },
    onAdd: function (map) {
        this._map = map;

        if (this._level === null) {
            var levels = this.getLevels();

            if (levels.length !== 0) {
                this._level = levels[0];
            }
        }

        if (this._level !== null) {
            this._map.addLayer(this._layers[this._level]);
        }
    },
    onRemove: function (map) {
        this._map.removeLayer(this._layers[this._level]);
        this._map = null;
    },
    addData: function(data) {
        var layers = this._layers;

        var options = this.options;

        var features = L.Util.isArray(data) ? data : data.features;

        features.forEach(function (part) {

            var level = options.getLevel(part);

            var layer;

            if (typeof level === 'undefined' ||
                level === null)
                return;

            if (!("geometry" in part)) {
                return;
            }

            if (L.Util.isArray(level)) {
                level.forEach(function(level) {
                    if (level in layers) {
                        layer = layers[level];
                    } else {
                        layer = layers[level] = L.geoJson({
                            type: "FeatureCollection",
                            features: []
                        }, options);
                    }

                    layer.addData(part);
                });
            } else {
                if (level in layers) {
                    layer = layers[level];
                } else {
                    layer = layers[level] = L.geoJson({
                        type: "FeatureCollection",
                        features: []
                    }, options);
                }

                layer.addData(part);
            }
        });
    },
    getLevels: function() {
        return Object.keys(this._layers);
    },
    getLevel: function() {
        return this._level;
    },
    setLevel: function(level) {
        if (typeof(level) === 'object') {
            level = level.newLevel;
        }

        if (this._level === level)
            return;

        var oldLayer = this._layers[this._level];
        var layer = this._layers[level];

        if (this._map !== null) {
            this._map.removeLayer(oldLayer);
            this._map.addLayer(layer);
        }

        this._level = level;
    }
});

L.indoor = function(data, options) {
    return new L.Indoor(data, options);
};

L.Control.Level = L.Control.extend({
    includes: L.Mixin.Events,

    options: {
        position: 'bottomright',
        parseLevel: function(level) {
            return parseInt(level, 10);
        }
    },

    initialize: function(options) {
        L.setOptions(this, options);

        this._map = null;
        this._buttons = {};
        this._listeners = [];
        this._level = options.level;

        this.addEventListener("levelchange", this._levelChange, this);
    },
    onAdd: function(map) {
        var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

        div.style.font = "18px 'Lucida Console',Monaco,monospace";

        var buttons = this._buttons;
        var activeLevel = this._level;
        var self = this;

        var levels = [];

        for (var i=0; i<this.options.levels.length; i++) {
            var level = this.options.levels[i];

            var levelNum = self.options.parseLevel(level);

            levels.push({
                num: levelNum,
                label: level
            });
        }

        levels.sort(function(a, b) {
            return a.num - b.num;
        });

        for (i=levels.length-1; i>=0; i--) {
            var level = levels[i].num;
            var originalLevel = levels[i].label;

            var levelBtn = L.DomUtil.create('a', 'leaflet-button-part', div);

            if (level === activeLevel || originalLevel === activeLevel) {
                levelBtn.style.backgroundColor = "#b0b0b0";
            }

            levelBtn.appendChild(levelBtn.ownerDocument.createTextNode(originalLevel));

            (function(level) {
                levelBtn.onclick = function() {
                    self.setLevel(level);
                };
            })(level);

            buttons[level] = levelBtn;
        }

        return div;
    },
    _levelChange: function(e) {
        if (this._map !== null) {
            if (typeof e.oldLevel !== "undefined")
                this._buttons[e.oldLevel].style.backgroundColor = "#FFFFFF";
            this._buttons[e.newLevel].style.backgroundColor = "#b0b0b0";
        }
    },
    setLevel: function(level) {

        if (level === this._level)
            return;

        var oldLevel = this._level;
        this._level = level;

        this.fireEvent("levelchange", {
            oldLevel: oldLevel,
            newLevel: level
        });
    },
    getLevel: function() {
        return this._level;
    }
});

L.Control.level = function (options) {
    return new L.Control.Level(options);
};
