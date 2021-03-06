var chart_rd;

var chartData3 = [];
var AmCharts_path = '/vendors/amcharts/';
var data_path = '/json-data/';


AmCharts.ready(function () {
	// SERIAL CHART
	chart_rd = new AmCharts.AmSerialChart();

	chart_rd.categoryField = "date";
	
	
	// data updated event will be fired when chart is first displayed,
	// also when data will be updated. We'll use it to set some
	// initial zoom
	chart_rd.addListener("dataUpdated", zoomChart3);

	// AXES
	// Category
	var categoryAxis = chart_rd.categoryAxis;
	categoryAxis.parseDates = true; // in order char to understand dates, we should set parseDates to true
	categoryAxis.minPeriod = "DD"; // as we have data with minute interval, we have to set "mm" here.
	categoryAxis.gridAlpha = 0.07;
	categoryAxis.axisColor = "#f2f9eb";
	categoryAxis.color = $('body').css('color');
	categoryAxis.gridColor = $('body').css('color');
	


	// Value
	var valueAxis = new AmCharts.ValueAxis();
	valueAxis.gridAlpha = 0.07;
	valueAxis.title = "Redeeming per date";
	valueAxis.color = $('body').css('color');
	valueAxis.titleColor = $('body').css('color');
	valueAxis.axisColor = "#f2f9eb";
	valueAxis.gridColor = $('body').css('color');
	chart_rd.addValueAxis(valueAxis);

	// GRAPH
	var graph2 = new AmCharts.AmGraph();
	graph2.type = "smoothedLine"; // try to change it to "column"  line  smoothedLine
	//graph2.title = "Volume ETH";
	graph2.valueField = "counter";
	graph2.lineAlpha = 1;
	graph2.lineColor = "#6e98f4";
	graph2.fillAlphas = 0.1; // setting fillAlphas to > 0 value makes it area graph
	graph2.balloonText= "<div style='margin:5px; font-size:16px;'>Deposits: <b>[[value]]</b><br>[[category]]</div>";
	graph2.bullet="round";
	
	chart_rd.addGraph(graph2);

	// CURSOR
	var chartCursor = new AmCharts.ChartCursor();
	chartCursor.cursorPosition = "mouse";
	chartCursor.categoryBalloonDateFormat = "DD MMMM YYYY";
	chartCursor.cursorColor = "#3498DB";
	chart_rd.addChartCursor(chartCursor);
	

	// SCROLLBAR
	var chartScrollbar = new AmCharts.ChartScrollbar();
	chartScrollbar.autoGridCount = true;
	chartScrollbar.selectedBackgroundColor = "#888888";
	chartScrollbar.color = "#000000";
	
	
		
	chart_rd.addChartScrollbar(chartScrollbar);
	
	
	// WRITE
	chart_rd.write("chart_redeemed");
	
	// generate some random data
	generateChartData3();
});


// generate some random data, quite different range
function generateChartData3() {

	$.getJSON( data_path +"redeemed.json", function( data ) {
		$.each( data, function( key, val ) {
			var newDate = new Date(val.date);
			chartData3.push({
				date: newDate,
				counter: val.counter
				
			});
		});
		chart_rd.dataProvider = chartData3;
		chart_rd.validateData();
		
	});
}

// this method is called when chart is first inited as we listen for "dataUpdated" event
function zoomChart3() {
	// different zoom methods can be used - zoomToIndexes, zoomToDates, zoomToCategoryValues
	chart_rd.zoomToIndexes(chartData3.length - 40, chartData3.length - 1);
}
