(function (React$1, ReactDOM, d3, topojson) {
  'use strict';

  var React$1__default = 'default' in React$1 ? React$1['default'] : React$1;
  ReactDOM = ReactDOM && Object.prototype.hasOwnProperty.call(ReactDOM, 'default') ? ReactDOM['default'] : ReactDOM;

  const jsonUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

  const useWorldAtlas = () => {
    const [data, setData] = React$1.useState(null);

    React$1.useEffect(() => {
      d3.json(jsonUrl).then(topology => {
        const { countries, land } = topology.objects;
        setData({
          land: topojson.feature(topology, land),
          interiors: topojson.mesh(topology, countries, (a, b) => a !== b)
        });
      });
    }, []);

    return data;
  };

  const csvUrl =
    'https://gist.githubusercontent.com/curran/a9656d711a8ad31d812b8f9963ac441c/raw/c22144062566de911ba32509613c84af2a99e8e2/MissingMigrants-Global-2019-10-08T09-47-14-subset.csv';

  const row = d => {
    d.coords = d['Location Coordinates'].split(',').map(d => +d).reverse();
    d['Total Dead and Missing'] = + d['Total Dead and Missing'];
    d['Reported Date'] = new Date(d['Reported Date']);
    return d;
  };

  const useData = () => {
    const [data, setData] = React$1.useState(null);

    React$1.useEffect(() => {
      d3.csv(csvUrl, row).then(setData);
    }, []);

    return data;
  };

  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule();

  const Marks = ({
    worldAtlas: { land, interiors },
    data,
    sizeScale,
    sizeValue
  }) => (
    React.createElement( 'g', { className: "marks" },
      React$1.useMemo(
        () => (
          React.createElement( React.Fragment, null,
            React.createElement( 'path', { className: "sphere", d: path({ type: 'Sphere' }) }),
            React.createElement( 'path', { className: "graticules", d: path(graticule()) }),
            land.features.map(feature => (
              React.createElement( 'path', { className: "land", d: path(feature) })
            )),
            React.createElement( 'path', { className: "interiors", d: path(interiors) })
          )
        ),
        [path, graticule, land, interiors]
      ),
      data.map(d => {
        const [x, y] = projection(d.coords);
        return React.createElement( 'circle', { cx: x, cy: y, r: sizeScale(sizeValue(d)) });
      })
    )
  );

  const sizeValue = d => d['Total Dead and Missing'];
  const maxRadius = 15;

  const BubbleMap = ({ data, filteredData, worldAtlas }) => {
    const sizeScale = React$1.useMemo(
      () =>
        d3.scaleSqrt()
          .domain([0, d3.max(data, sizeValue)])
          .range([0, maxRadius]),
      [data, sizeValue, maxRadius]
    );

    return (
      React$1__default.createElement( Marks, {
        worldAtlas: worldAtlas, data: filteredData, sizeScale: sizeScale, sizeValue: sizeValue })
    );
  };

  const AxisBottom = ({ xScale, innerHeight, tickFormat, tickOffset = 3 }) =>
    xScale.ticks().map(tickValue => (
      React.createElement( 'g', {
        className: "tick", key: tickValue, transform: `translate(${xScale(tickValue)},0)` },
        React.createElement( 'line', { y2: innerHeight }),
        React.createElement( 'text', { style: { textAnchor: 'middle' }, dy: ".71em", y: innerHeight + tickOffset },
          tickFormat(tickValue)
        )
      )
    ));

  const AxisLeft = ({ yScale, innerWidth, tickOffset = 3 }) =>
    yScale.ticks().map(tickValue => (
      React.createElement( 'g', { className: "tick", transform: `translate(0,${yScale(tickValue)})` },
        React.createElement( 'line', { x2: innerWidth }),
        React.createElement( 'text', {
          key: tickValue, style: { textAnchor: 'end' }, x: -tickOffset, dy: ".32em" },
          tickValue
        )
      )
    ));

  const Marks$1 = ({
    binnedData,
    xScale,
    yScale,
    tooltipFormat,
    innerHeight
  }) =>
    binnedData.map(d => (
      React.createElement( 'rect', {
        className: "mark", x: xScale(d.x0), y: yScale(d.y), width: xScale(d.x1) - xScale(d.x0), height: innerHeight - yScale(d.y) },
        React.createElement( 'title', null, tooltipFormat(d.y) )
      )
    ));

  const margin = { top: 2, right: 30, bottom: 20, left: 45 };
  const xAxisLabelOffset = 54;
  const yAxisLabelOffset = 30;
  const xAxisTickFormat = d3.timeFormat('%m/%d/%Y');

  const xAxisLabel = 'Time';

  const yValue = d => d['Total Dead and Missing'];
  const yAxisLabel = 'Total Dead and Missing';

  const DateHistogram = ({
    data,
    width,
    height,
    setBrushExtent,
    xValue
  }) => {
    const innerHeight = height - margin.top - margin.bottom;
    const innerWidth = width - margin.left - margin.right;

    const xScale = React$1.useMemo(
      () =>
        d3.scaleTime()
          .domain(d3.extent(data, xValue))
          .range([0, innerWidth])
          .nice(),
      [data, xValue, innerWidth]
    );

    const binnedData = React$1.useMemo(() => {
      const [start, stop] = xScale.domain();
      return d3.histogram()
        .value(xValue)
        .domain(xScale.domain())
        .thresholds(d3.timeMonths(start, stop))(data)
        .map(array => ({
          y: d3.sum(array, yValue),
          x0: array.x0,
          x1: array.x1
        }));
    }, [xValue, yValue, xScale, data]);

    const yScale = React$1.useMemo(
      () =>
        d3.scaleLinear()
          .domain([0, d3.max(binnedData, d => d.y)])
          .range([innerHeight, 0]),
      [binnedData, innerHeight]
    );

    const brushRef = React$1.useRef();

    React$1.useEffect(() => {
      const brush = d3.brushX().extent([[0, 0], [innerWidth, innerHeight]]);
      brush(d3.select(brushRef.current));
      brush.on('brush end', () => {
        setBrushExtent(d3.event.selection && d3.event.selection.map(xScale.invert));
      });
    }, [innerWidth, innerHeight]);

    return (
      React.createElement( React.Fragment, null,
        React.createElement( 'rect', { width: width, height: height, fill: "#2c001e" }),
        React.createElement( 'g', { transform: `translate(${margin.left},${margin.top})` },
          React.createElement( AxisBottom, {
            xScale: xScale, yScale: yScale, innerHeight: innerHeight, tickFormat: xAxisTickFormat, tickOffset: 5 }),  
          
          React.createElement( 'text', {
            className: "axis-label", textAnchor: "middle", transform: `translate(${-yAxisLabelOffset},${innerHeight /
            2}) rotate(-90)` },
            yAxisLabel
          ),
          React.createElement( AxisLeft, { yScale: yScale, innerWidth: innerWidth, tickOffset: 5 }),
          React.createElement( 'text', {
            className: "axis-label", x: innerWidth / 2, y: innerHeight + xAxisLabelOffset, textAnchor: "middle" },
            xAxisLabel
          ),
          React.createElement( Marks$1, {
            binnedData: binnedData, xScale: xScale, yScale: yScale, tooltipFormat: d => d, circleRadius: 2, innerHeight: innerHeight }),
          React.createElement( 'g', { ref: brushRef })
        )
      )
    );
  };

  const width = 960;
  const height = 500;
  const dateHistogramSize = 0.150;

  const xValue = d => d['Reported Date'];

  const App = () => {
    const worldAtlas = useWorldAtlas();
    const data = useData();
    const [brushExtent, setBrushExtent] = React$1.useState();

    if (!worldAtlas || !data) {
      return React$1__default.createElement( 'pre', null, "Loading..." );
    }

    const filteredData = brushExtent
      ? data.filter(d => {
          const date = xValue(d);
          return date > brushExtent[0] && date < brushExtent[1];
        })
      : data;

    return (
      React$1__default.createElement( 'svg', { width: width, height: height },
        React$1__default.createElement( BubbleMap, {
          data: data, filteredData: filteredData, worldAtlas: worldAtlas }),
        React$1__default.createElement( 'g', { transform: `translate(0, ${height - dateHistogramSize * height})` },
          React$1__default.createElement( DateHistogram, {
            data: data, width: width, height: dateHistogramSize * height, setBrushExtent: setBrushExtent, xValue: xValue })
        )
      )
    );
  };
  const rootElement = document.getElementById('root');
  ReactDOM.render(React$1__default.createElement( App, null ), rootElement);

}(React, ReactDOM, d3, topojson));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInVzZVdvcmxkQXRsYXMuanMiLCJ1c2VEYXRhLmpzIiwiQnViYmxlTWFwL01hcmtzLmpzIiwiQnViYmxlTWFwL2luZGV4LmpzIiwiRGF0ZUhpc3RvZ3JhbS9BeGlzQm90dG9tLmpzIiwiRGF0ZUhpc3RvZ3JhbS9BeGlzTGVmdC5qcyIsIkRhdGVIaXN0b2dyYW0vTWFya3MuanMiLCJEYXRlSGlzdG9ncmFtL2luZGV4LmpzIiwiaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBqc29uIH0gZnJvbSAnZDMnO1xuaW1wb3J0IHsgZmVhdHVyZSwgbWVzaCB9IGZyb20gJ3RvcG9qc29uJztcblxuY29uc3QganNvblVybCA9ICdodHRwczovL3VucGtnLmNvbS93b3JsZC1hdGxhc0AyLjAuMi9jb3VudHJpZXMtNTBtLmpzb24nO1xuXG5leHBvcnQgY29uc3QgdXNlV29ybGRBdGxhcyA9ICgpID0+IHtcbiAgY29uc3QgW2RhdGEsIHNldERhdGFdID0gdXNlU3RhdGUobnVsbCk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBqc29uKGpzb25VcmwpLnRoZW4odG9wb2xvZ3kgPT4ge1xuICAgICAgY29uc3QgeyBjb3VudHJpZXMsIGxhbmQgfSA9IHRvcG9sb2d5Lm9iamVjdHM7XG4gICAgICBzZXREYXRhKHtcbiAgICAgICAgbGFuZDogZmVhdHVyZSh0b3BvbG9neSwgbGFuZCksXG4gICAgICAgIGludGVyaW9yczogbWVzaCh0b3BvbG9neSwgY291bnRyaWVzLCAoYSwgYikgPT4gYSAhPT0gYilcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuIiwiaW1wb3J0IHsgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNzdiB9IGZyb20gJ2QzJztcblxuY29uc3QgY3N2VXJsID1cbiAgJ2h0dHBzOi8vZ2lzdC5naXRodWJ1c2VyY29udGVudC5jb20vY3VycmFuL2E5NjU2ZDcxMWE4YWQzMWQ4MTJiOGY5OTYzYWM0NDFjL3Jhdy9jMjIxNDQwNjI1NjZkZTkxMWJhMzI1MDk2MTNjODRhZjJhOTllOGUyL01pc3NpbmdNaWdyYW50cy1HbG9iYWwtMjAxOS0xMC0wOFQwOS00Ny0xNC1zdWJzZXQuY3N2JztcblxuY29uc3Qgcm93ID0gZCA9PiB7XG4gIGQuY29vcmRzID0gZFsnTG9jYXRpb24gQ29vcmRpbmF0ZXMnXS5zcGxpdCgnLCcpLm1hcChkID0+ICtkKS5yZXZlcnNlKCk7XG4gIGRbJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnXSA9ICsgZFsnVG90YWwgRGVhZCBhbmQgTWlzc2luZyddO1xuICBkWydSZXBvcnRlZCBEYXRlJ10gPSBuZXcgRGF0ZShkWydSZXBvcnRlZCBEYXRlJ10pO1xuICByZXR1cm4gZDtcbn07XG5cbmV4cG9ydCBjb25zdCB1c2VEYXRhID0gKCkgPT4ge1xuICBjb25zdCBbZGF0YSwgc2V0RGF0YV0gPSB1c2VTdGF0ZShudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNzdihjc3ZVcmwsIHJvdykudGhlbihzZXREYXRhKTtcbiAgfSwgW10pO1xuXG4gIHJldHVybiBkYXRhO1xufTtcbiIsImltcG9ydCB7IGdlb05hdHVyYWxFYXJ0aDEsIGdlb1BhdGgsIGdlb0dyYXRpY3VsZSB9IGZyb20gJ2QzJztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICdyZWFjdCc7IFxuXG5jb25zdCBwcm9qZWN0aW9uID0gZ2VvTmF0dXJhbEVhcnRoMSgpO1xuY29uc3QgcGF0aCA9IGdlb1BhdGgocHJvamVjdGlvbik7XG5jb25zdCBncmF0aWN1bGUgPSBnZW9HcmF0aWN1bGUoKTtcblxuZXhwb3J0IGNvbnN0IE1hcmtzID0gKHtcbiAgd29ybGRBdGxhczogeyBsYW5kLCBpbnRlcmlvcnMgfSxcbiAgZGF0YSxcbiAgc2l6ZVNjYWxlLFxuICBzaXplVmFsdWVcbn0pID0+IChcbiAgPGcgY2xhc3NOYW1lPVwibWFya3NcIj5cbiAgICB7dXNlTWVtbyhcbiAgICAgICgpID0+IChcbiAgICAgICAgPD5cbiAgICAgICAgICA8cGF0aCBjbGFzc05hbWU9XCJzcGhlcmVcIiBkPXtwYXRoKHsgdHlwZTogJ1NwaGVyZScgfSl9IC8+XG4gICAgICAgICAgPHBhdGggY2xhc3NOYW1lPVwiZ3JhdGljdWxlc1wiIGQ9e3BhdGgoZ3JhdGljdWxlKCkpfSAvPlxuICAgICAgICAgIHtsYW5kLmZlYXR1cmVzLm1hcChmZWF0dXJlID0+IChcbiAgICAgICAgICAgIDxwYXRoIGNsYXNzTmFtZT1cImxhbmRcIiBkPXtwYXRoKGZlYXR1cmUpfSAvPlxuICAgICAgICAgICkpfVxuICAgICAgICAgIDxwYXRoIGNsYXNzTmFtZT1cImludGVyaW9yc1wiIGQ9e3BhdGgoaW50ZXJpb3JzKX0gLz5cbiAgICAgICAgPC8+XG4gICAgICApLFxuICAgICAgW3BhdGgsIGdyYXRpY3VsZSwgbGFuZCwgaW50ZXJpb3JzXVxuICAgICl9XG4gICAge2RhdGEubWFwKGQgPT4ge1xuICAgICAgY29uc3QgW3gsIHldID0gcHJvamVjdGlvbihkLmNvb3Jkcyk7XG4gICAgICByZXR1cm4gPGNpcmNsZSBjeD17eH0gY3k9e3l9IHI9e3NpemVTY2FsZShzaXplVmFsdWUoZCkpfSAvPjtcbiAgICB9KX1cbiAgPC9nPlxuKTtcbiIsImltcG9ydCBSZWFjdCwgeyB1c2VNZW1vIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgc2NhbGVTcXJ0LCBtYXggfSBmcm9tICdkMyc7XG5pbXBvcnQgeyBNYXJrcyB9IGZyb20gJy4vTWFya3MnO1xuXG5jb25zdCBzaXplVmFsdWUgPSBkID0+IGRbJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnXTtcbmNvbnN0IG1heFJhZGl1cyA9IDE1O1xuXG5leHBvcnQgY29uc3QgQnViYmxlTWFwID0gKHsgZGF0YSwgZmlsdGVyZWREYXRhLCB3b3JsZEF0bGFzIH0pID0+IHtcbiAgY29uc3Qgc2l6ZVNjYWxlID0gdXNlTWVtbyhcbiAgICAoKSA9PlxuICAgICAgc2NhbGVTcXJ0KClcbiAgICAgICAgLmRvbWFpbihbMCwgbWF4KGRhdGEsIHNpemVWYWx1ZSldKVxuICAgICAgICAucmFuZ2UoWzAsIG1heFJhZGl1c10pLFxuICAgIFtkYXRhLCBzaXplVmFsdWUsIG1heFJhZGl1c11cbiAgKTtcblxuICByZXR1cm4gKFxuICAgIDxNYXJrc1xuICAgICAgd29ybGRBdGxhcz17d29ybGRBdGxhc31cbiAgICAgIGRhdGE9e2ZpbHRlcmVkRGF0YX1cbiAgICAgIHNpemVTY2FsZT17c2l6ZVNjYWxlfVxuICAgICAgc2l6ZVZhbHVlPXtzaXplVmFsdWV9XG4gICAgLz5cbiAgKTtcbn07XG4iLCJleHBvcnQgY29uc3QgQXhpc0JvdHRvbSA9ICh7IHhTY2FsZSwgaW5uZXJIZWlnaHQsIHRpY2tGb3JtYXQsIHRpY2tPZmZzZXQgPSAzIH0pID0+XG4gIHhTY2FsZS50aWNrcygpLm1hcCh0aWNrVmFsdWUgPT4gKFxuICAgIDxnXG4gICAgICBjbGFzc05hbWU9XCJ0aWNrXCJcbiAgICAgIGtleT17dGlja1ZhbHVlfVxuICAgICAgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7eFNjYWxlKHRpY2tWYWx1ZSl9LDApYH1cbiAgICA+XG4gICAgICA8bGluZSB5Mj17aW5uZXJIZWlnaHR9IC8+XG4gICAgICA8dGV4dCBzdHlsZT17eyB0ZXh0QW5jaG9yOiAnbWlkZGxlJyB9fSBkeT1cIi43MWVtXCIgeT17aW5uZXJIZWlnaHQgKyB0aWNrT2Zmc2V0fT5cbiAgICAgICAge3RpY2tGb3JtYXQodGlja1ZhbHVlKX1cbiAgICAgIDwvdGV4dD5cbiAgICA8L2c+XG4gICkpO1xuIiwiZXhwb3J0IGNvbnN0IEF4aXNMZWZ0ID0gKHsgeVNjYWxlLCBpbm5lcldpZHRoLCB0aWNrT2Zmc2V0ID0gMyB9KSA9PlxuICB5U2NhbGUudGlja3MoKS5tYXAodGlja1ZhbHVlID0+IChcbiAgICA8ZyBjbGFzc05hbWU9XCJ0aWNrXCIgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKDAsJHt5U2NhbGUodGlja1ZhbHVlKX0pYH0+XG4gICAgICA8bGluZSB4Mj17aW5uZXJXaWR0aH0gLz5cbiAgICAgIDx0ZXh0XG4gICAgICAgIGtleT17dGlja1ZhbHVlfVxuICAgICAgICBzdHlsZT17eyB0ZXh0QW5jaG9yOiAnZW5kJyB9fVxuICAgICAgICB4PXstdGlja09mZnNldH1cbiAgICAgICAgZHk9XCIuMzJlbVwiXG4gICAgICA+XG4gICAgICAgIHt0aWNrVmFsdWV9XG4gICAgICA8L3RleHQ+XG4gICAgPC9nPlxuICApKTtcbiIsImV4cG9ydCBjb25zdCBNYXJrcyA9ICh7XG4gIGJpbm5lZERhdGEsXG4gIHhTY2FsZSxcbiAgeVNjYWxlLFxuICB0b29sdGlwRm9ybWF0LFxuICBpbm5lckhlaWdodFxufSkgPT5cbiAgYmlubmVkRGF0YS5tYXAoZCA9PiAoXG4gICAgPHJlY3RcbiAgICAgIGNsYXNzTmFtZT1cIm1hcmtcIlxuICAgICAgeD17eFNjYWxlKGQueDApfVxuICAgICAgeT17eVNjYWxlKGQueSl9XG4gICAgICB3aWR0aD17eFNjYWxlKGQueDEpIC0geFNjYWxlKGQueDApfVxuICAgICAgaGVpZ2h0PXtpbm5lckhlaWdodCAtIHlTY2FsZShkLnkpfVxuICAgID5cbiAgICAgIDx0aXRsZT57dG9vbHRpcEZvcm1hdChkLnkpfTwvdGl0bGU+XG4gICAgPC9yZWN0PlxuICApKTtcbiIsImltcG9ydCB7XG4gIHNjYWxlTGluZWFyLFxuICBzY2FsZVRpbWUsXG4gIG1heCxcbiAgdGltZUZvcm1hdCxcbiAgZXh0ZW50LFxuICBoaXN0b2dyYW0gYXMgYmluLFxuICB0aW1lTW9udGhzLFxuICBzdW0sXG4gIGJydXNoWCxcbiAgc2VsZWN0LFxuICBldmVudFxufSBmcm9tICdkMyc7XG5pbXBvcnQgeyB1c2VSZWYsIHVzZUVmZmVjdCwgdXNlTWVtbyB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEF4aXNCb3R0b20gfSBmcm9tICcuL0F4aXNCb3R0b20nO1xuaW1wb3J0IHsgQXhpc0xlZnQgfSBmcm9tICcuL0F4aXNMZWZ0JztcbmltcG9ydCB7IE1hcmtzIH0gZnJvbSAnLi9NYXJrcyc7XG5cbmNvbnN0IG1hcmdpbiA9IHsgdG9wOiAyLCByaWdodDogMzAsIGJvdHRvbTogMjAsIGxlZnQ6IDQ1IH07XG5jb25zdCB4QXhpc0xhYmVsT2Zmc2V0ID0gNTQ7XG5jb25zdCB5QXhpc0xhYmVsT2Zmc2V0ID0gMzA7XG5jb25zdCB4QXhpc1RpY2tGb3JtYXQgPSB0aW1lRm9ybWF0KCclbS8lZC8lWScpO1xuXG5jb25zdCB4QXhpc0xhYmVsID0gJ1RpbWUnO1xuXG5jb25zdCB5VmFsdWUgPSBkID0+IGRbJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnXTtcbmNvbnN0IHlBeGlzTGFiZWwgPSAnVG90YWwgRGVhZCBhbmQgTWlzc2luZyc7XG5cbmV4cG9ydCBjb25zdCBEYXRlSGlzdG9ncmFtID0gKHtcbiAgZGF0YSxcbiAgd2lkdGgsXG4gIGhlaWdodCxcbiAgc2V0QnJ1c2hFeHRlbnQsXG4gIHhWYWx1ZVxufSkgPT4ge1xuICBjb25zdCBpbm5lckhlaWdodCA9IGhlaWdodCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuICBjb25zdCBpbm5lcldpZHRoID0gd2lkdGggLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodDtcblxuICBjb25zdCB4U2NhbGUgPSB1c2VNZW1vKFxuICAgICgpID0+XG4gICAgICBzY2FsZVRpbWUoKVxuICAgICAgICAuZG9tYWluKGV4dGVudChkYXRhLCB4VmFsdWUpKVxuICAgICAgICAucmFuZ2UoWzAsIGlubmVyV2lkdGhdKVxuICAgICAgICAubmljZSgpLFxuICAgIFtkYXRhLCB4VmFsdWUsIGlubmVyV2lkdGhdXG4gICk7XG5cbiAgY29uc3QgYmlubmVkRGF0YSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IFtzdGFydCwgc3RvcF0gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgcmV0dXJuIGJpbigpXG4gICAgICAudmFsdWUoeFZhbHVlKVxuICAgICAgLmRvbWFpbih4U2NhbGUuZG9tYWluKCkpXG4gICAgICAudGhyZXNob2xkcyh0aW1lTW9udGhzKHN0YXJ0LCBzdG9wKSkoZGF0YSlcbiAgICAgIC5tYXAoYXJyYXkgPT4gKHtcbiAgICAgICAgeTogc3VtKGFycmF5LCB5VmFsdWUpLFxuICAgICAgICB4MDogYXJyYXkueDAsXG4gICAgICAgIHgxOiBhcnJheS54MVxuICAgICAgfSkpO1xuICB9LCBbeFZhbHVlLCB5VmFsdWUsIHhTY2FsZSwgZGF0YV0pO1xuXG4gIGNvbnN0IHlTY2FsZSA9IHVzZU1lbW8oXG4gICAgKCkgPT5cbiAgICAgIHNjYWxlTGluZWFyKClcbiAgICAgICAgLmRvbWFpbihbMCwgbWF4KGJpbm5lZERhdGEsIGQgPT4gZC55KV0pXG4gICAgICAgIC5yYW5nZShbaW5uZXJIZWlnaHQsIDBdKSxcbiAgICBbYmlubmVkRGF0YSwgaW5uZXJIZWlnaHRdXG4gICk7XG5cbiAgY29uc3QgYnJ1c2hSZWYgPSB1c2VSZWYoKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGJydXNoID0gYnJ1c2hYKCkuZXh0ZW50KFtbMCwgMF0sIFtpbm5lcldpZHRoLCBpbm5lckhlaWdodF1dKTtcbiAgICBicnVzaChzZWxlY3QoYnJ1c2hSZWYuY3VycmVudCkpO1xuICAgIGJydXNoLm9uKCdicnVzaCBlbmQnLCAoKSA9PiB7XG4gICAgICBzZXRCcnVzaEV4dGVudChldmVudC5zZWxlY3Rpb24gJiYgZXZlbnQuc2VsZWN0aW9uLm1hcCh4U2NhbGUuaW52ZXJ0KSk7XG4gICAgfSk7XG4gIH0sIFtpbm5lcldpZHRoLCBpbm5lckhlaWdodF0pO1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxyZWN0IHdpZHRoPXt3aWR0aH0gaGVpZ2h0PXtoZWlnaHR9IGZpbGw9XCIjMmMwMDFlXCIgLz5cbiAgICAgIDxnIHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwke21hcmdpbi50b3B9KWB9PlxuICAgICAgICA8QXhpc0JvdHRvbVxuICAgICAgICAgIHhTY2FsZT17eFNjYWxlfVxuICAgICAgICAgIHlTY2FsZT17eVNjYWxlfVxuICAgICAgICAgIGlubmVySGVpZ2h0PXtpbm5lckhlaWdodH1cbiAgICAgICAgICB0aWNrRm9ybWF0PXt4QXhpc1RpY2tGb3JtYXR9XG4gICAgICAgICAgdGlja09mZnNldD17NX1cbiAgICAgICAgIC8+IFxuICAgICAgICBcbiAgICAgICAgPHRleHRcbiAgICAgICAgICBjbGFzc05hbWU9XCJheGlzLWxhYmVsXCJcbiAgICAgICAgICB0ZXh0QW5jaG9yPVwibWlkZGxlXCJcbiAgICAgICAgICB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHsteUF4aXNMYWJlbE9mZnNldH0sJHtpbm5lckhlaWdodCAvXG4gICAgICAgICAgICAyfSkgcm90YXRlKC05MClgfVxuICAgICAgICA+XG4gICAgICAgICAge3lBeGlzTGFiZWx9XG4gICAgICAgIDwvdGV4dD5cbiAgICAgICAgPEF4aXNMZWZ0IHlTY2FsZT17eVNjYWxlfSBpbm5lcldpZHRoPXtpbm5lcldpZHRofSB0aWNrT2Zmc2V0PXs1fSAvPlxuICAgICAgICA8dGV4dFxuICAgICAgICAgIGNsYXNzTmFtZT1cImF4aXMtbGFiZWxcIlxuICAgICAgICAgIHg9e2lubmVyV2lkdGggLyAyfVxuICAgICAgICAgIHk9e2lubmVySGVpZ2h0ICsgeEF4aXNMYWJlbE9mZnNldH1cbiAgICAgICAgICB0ZXh0QW5jaG9yPVwibWlkZGxlXCJcbiAgICAgICAgPlxuICAgICAgICAgIHt4QXhpc0xhYmVsfVxuICAgICAgICA8L3RleHQ+XG4gICAgICAgIDxNYXJrc1xuICAgICAgICAgIGJpbm5lZERhdGE9e2Jpbm5lZERhdGF9XG4gICAgICAgICAgeFNjYWxlPXt4U2NhbGV9XG4gICAgICAgICAgeVNjYWxlPXt5U2NhbGV9XG4gICAgICAgICAgdG9vbHRpcEZvcm1hdD17ZCA9PiBkfVxuICAgICAgICAgIGNpcmNsZVJhZGl1cz17Mn1cbiAgICAgICAgICBpbm5lckhlaWdodD17aW5uZXJIZWlnaHR9XG4gICAgICAgIC8+XG4gICAgICAgIDxnIHJlZj17YnJ1c2hSZWZ9IC8+XG4gICAgICA8L2c+XG4gICAgPC8+XG4gICk7XG59O1xuIiwiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSc7XG5pbXBvcnQgeyB1c2VXb3JsZEF0bGFzIH0gZnJvbSAnLi91c2VXb3JsZEF0bGFzJztcbmltcG9ydCB7IHVzZURhdGEgfSBmcm9tICcuL3VzZURhdGEnO1xuaW1wb3J0IHsgQnViYmxlTWFwIH0gZnJvbSAnLi9CdWJibGVNYXAvaW5kZXguanMnO1xuaW1wb3J0IHsgRGF0ZUhpc3RvZ3JhbSB9IGZyb20gJy4vRGF0ZUhpc3RvZ3JhbS9pbmRleC5qcyc7XG5cbmNvbnN0IHdpZHRoID0gOTYwO1xuY29uc3QgaGVpZ2h0ID0gNTAwO1xuY29uc3QgZGF0ZUhpc3RvZ3JhbVNpemUgPSAwLjE1MDtcblxuY29uc3QgeFZhbHVlID0gZCA9PiBkWydSZXBvcnRlZCBEYXRlJ107XG5cbmNvbnN0IEFwcCA9ICgpID0+IHtcbiAgY29uc3Qgd29ybGRBdGxhcyA9IHVzZVdvcmxkQXRsYXMoKTtcbiAgY29uc3QgZGF0YSA9IHVzZURhdGEoKTtcbiAgY29uc3QgW2JydXNoRXh0ZW50LCBzZXRCcnVzaEV4dGVudF0gPSB1c2VTdGF0ZSgpO1xuXG4gIGlmICghd29ybGRBdGxhcyB8fCAhZGF0YSkge1xuICAgIHJldHVybiA8cHJlPkxvYWRpbmcuLi48L3ByZT47XG4gIH1cblxuICBjb25zdCBmaWx0ZXJlZERhdGEgPSBicnVzaEV4dGVudFxuICAgID8gZGF0YS5maWx0ZXIoZCA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSB4VmFsdWUoZCk7XG4gICAgICAgIHJldHVybiBkYXRlID4gYnJ1c2hFeHRlbnRbMF0gJiYgZGF0ZSA8IGJydXNoRXh0ZW50WzFdO1xuICAgICAgfSlcbiAgICA6IGRhdGE7XG5cbiAgcmV0dXJuIChcbiAgICA8c3ZnIHdpZHRoPXt3aWR0aH0gaGVpZ2h0PXtoZWlnaHR9PlxuICAgICAgPEJ1YmJsZU1hcFxuICAgICAgICBkYXRhPXtkYXRhfVxuICAgICAgICBmaWx0ZXJlZERhdGE9e2ZpbHRlcmVkRGF0YX1cbiAgICAgICAgd29ybGRBdGxhcz17d29ybGRBdGxhc31cbiAgICAgIC8+XG4gICAgICA8ZyB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoMCwgJHtoZWlnaHQgLSBkYXRlSGlzdG9ncmFtU2l6ZSAqIGhlaWdodH0pYH0+XG4gICAgICAgIDxEYXRlSGlzdG9ncmFtXG4gICAgICAgICAgZGF0YT17ZGF0YX1cbiAgICAgICAgICB3aWR0aD17d2lkdGh9XG4gICAgICAgICAgaGVpZ2h0PXtkYXRlSGlzdG9ncmFtU2l6ZSAqIGhlaWdodH1cbiAgICAgICAgICBzZXRCcnVzaEV4dGVudD17c2V0QnJ1c2hFeHRlbnR9XG4gICAgICAgICAgeFZhbHVlPXt4VmFsdWV9XG4gICAgICAgIC8+XG4gICAgICA8L2c+XG4gICAgPC9zdmc+XG4gICk7XG59O1xuY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpO1xuUmVhY3RET00ucmVuZGVyKDxBcHAgLz4sIHJvb3RFbGVtZW50KTtcbiJdLCJuYW1lcyI6WyJ1c2VTdGF0ZSIsInVzZUVmZmVjdCIsImpzb24iLCJmZWF0dXJlIiwibWVzaCIsImNzdiIsImdlb05hdHVyYWxFYXJ0aDEiLCJnZW9QYXRoIiwiZ2VvR3JhdGljdWxlIiwidXNlTWVtbyIsInNjYWxlU3FydCIsIm1heCIsIlJlYWN0IiwiTWFya3MiLCJ0aW1lRm9ybWF0Iiwic2NhbGVUaW1lIiwiZXh0ZW50IiwiYmluIiwidGltZU1vbnRocyIsInN1bSIsInNjYWxlTGluZWFyIiwidXNlUmVmIiwiYnJ1c2hYIiwic2VsZWN0IiwiZXZlbnQiXSwibWFwcGluZ3MiOiI7Ozs7OztFQUlBLE1BQU0sT0FBTyxHQUFHLHdEQUF3RCxDQUFDO0FBQ3pF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
