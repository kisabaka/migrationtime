
const Scales = {
  AvgProcessingTime: {
    domain: [1, 90, 30 * 6, 30 * 9, 365, 180 + 365, 365 * 2, 365 * 3, 365 * 4],
    colorRange: ["#ccc", "#fa0", "#f5e800", "#5fcd59", "#15928d", "#2e6590", "#453182", "#450055", "#000"],
    labels: ['undefined', 'under 3 months', 'up to 6 months', 'up to 9 months', 'up to 1 year', 'up to 18 months', 'up to 2 years', 'up to 3 years', 'up to 4 years']
  }
};


class GeoRegion {
  constructor(alpha3, props) {
    this.alpha3 = alpha3;
    this.props = props || new Map();
  }

  get(prop) {
    return this.props.get(prop);
  }

  avgProcessingTime() {
    return this.get('AvgProcessingTime');
  }

  granted() {
    return this.get('Granted') || 0;
  }

  refused() {
    return this.get('Refused') || 0;
  }

  incoming() {
    return this.get('Queued') || 0;
  }
};


class CitizenshipData {
  static loadCsv(url) {
    const maximums = new Map();
    const minimums = new Map();
    const data = new Map();

    return d3.csv(url, function(d) {
      if (!data.has(d.Year)) {
        data.set(d.Year, new Map());
      }
      const year = data.get(d.Year)
      const datum = {
        Queued: +d.Queued,
        Dequeued: +d.Dequeued,
        Granted: +d.Granted,
        Refused: +d.Refused,
        Canceled: +d.Canceled,
        Pending: +d.Pending,
        AvgProcessingTime: +d.AvgProcessingTime
      };
      const datumMap = new Map([['Country', d.Country]]);
      Object.keys(datum).forEach((key) => {
        // Merge values if there's already a row for the same geo.
        let oldValue = 0;
        if (year.has(d.Alpha3)) {
          oldValue = datumMap.get(key);
        }
        let newValue = datum[key];
        if (oldValue > 0) {
          if (key == 'AvgProcessingTime') {
            newValue = Math.floor((oldValue + newValue) / 2);
          } else {
            newValue = oldValue + newValue;
          }
        }
        datumMap.set(key, newValue);
        maximums.set(key, Math.max(maximums.get(key) || 0, newValue));
        minimums.set(key, Math.max(minimums.get(key) || 0, newValue));
      })
      year.set(d.Alpha3, datumMap);
    }).then(() => {
      return new CitizenshipData(data, maximums, minimums);
    });
  }

  constructor(dataMap, maximums, minimums) {
    this.data = dataMap;
    this.maximums = maximums;
    this.minimums = minimums;
    this.years = Array.from(dataMap.keys()).sort()
  }

  forGeoInYear(geo, year) {
    const yearData = this.data.get(year);
    if (yearData) {
      return new GeoRegion(geo, yearData.get(geo));
    }
  }

  colorScale(metric) {
    const metricScale = Scales[metric]
    if (metricScale) {
      return d3.scaleThreshold()
      .domain(metricScale.domain)
      .range(metricScale.colorRange);
    }
    return d3.scaleThreshold()
        .domain([this.minimums[metric], this.maximums[metric]])
        .range(d3.schemeBlues[7]);
  }

  labels(metric) {
    const metricScale = Scales[metric]
    if (metricScale) {
      const result = [];
      for (let i = 0; i < metricScale.labels.length; i++) {
        result.push([metricScale.labels[i], metricScale.colorRange[i]]);
      }
      return result;
    }
    return [];
  }

  getYears() {
    return this.years;
  }
};