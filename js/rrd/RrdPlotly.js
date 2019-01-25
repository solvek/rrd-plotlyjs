/**
 * Helping class which allows to plot DSs from an RRD file.
 * plot - plots RRD data sources
 * loadRrd - for loading rrd file
 *
 * In order to change plotting behaviour you may inherit new class from RrdPlotly and override methods you want to change. See index.html for an example.
 */
class RrdPlotly {
    /**
     *
     * @param rrdProvider either a URL or Promise<RRDFile>
     * @param id an id of html element to plot in
     * @param options For now only one option is supported {title: "Chart title"}
     * @returns Promise<T> where T - is an html element (provided by id)
     */
    plot(rrdProvider, id, options){
        this.options = options;
        this.elementId = id;
        this.plotly = document.getElementById(this.elementId);

        if (typeof rrdProvider === 'string' || rrdProvider instanceof String){
            rrdProvider = this.loadRrd(rrdProvider);
        }

        return rrdProvider
            .then(rrd => {
                this.initRrd(rrd);
                this.plotRrd();
                return this.plotly;
            });
    }

    /**
     * Loads RRD from url and parses it
     * @param url String
     * @returns {Promise<RRDFile>}
     */
    loadRrd(url){
        return new Promise((resolve, reject) => {
            FetchBinaryURLAsync(url, (bf)=>{
                try {
                    this.rrd = new RRDFile(bf);
                    resolve(this.rrd);
                }
                catch(e){
                    reject(e);
                }
            });
        });
    }

    getDsName(ds){
        return ds.getName();
    }

    getDsColor(ds){
        let idx = ds.getIdx();
        return "#"+[5, 7, 13, 17, 23, 29].map(c=>{
            "f9482673a1c5eb0d".charAt((c*idx)%16);
        }).join("");
    }

    getDsAxis(){
        return "y1";
    }

    getShownDSs(){
        let rrd = this.rrd;
        return [...(function* (){
            for(var i=0;i<rrd.getNrDSs();i++){
                let ds = rrd.getDS(i);
                yield ds;
            }
        })()];
    }

    getData(dsIdx){
        let data = [];

        for(var i=0;i<this.rows;i++){
            let v = this.rra.getEl(i, dsIdx);
            data.push(v);
        }

        return data;
    }

    createTrace(ds){
        return {
            type: "scatter",
            mode: "lines",
            name: this.getDsName(ds),
            x: this.dates,
            y: this.getData(ds.getIdx()),
            yaxis: this.getDsAxis(ds),
            line: {
                shape: 'spline',
                color: this.getDsColor(ds)
            },
            connectgaps: true
        };
    }

    createData(){
        return this.shownDSs.map(ds => this.createTrace(ds));
    }

    createRraButtons(){
        let buttons = [];

        for(var i=0;i<this.rrd.getNrRRAs();i++){
            let rra=this.rrd.getRRAInfo(i);
            let step=rra.getStep();
            let rows=rra.getNrRows();
            let period=step*rows;

            buttons.push({
                args: [i],
                label: `${this.formatTime(step)} (${this.formatTime(period)})`,
                method: 'skip'
            });
        }

        return buttons;
    }

    createLayout(){
        let startDate = this.dates[0];
        let endDate = this.dates[this.dates.length-1];
        return {
            title: this.options.title,
            margin: {
                l: 50,
                r: 0,
                t: 50,
                b: 10
            },
            updatemenus: [
                {
                    buttons: this.createRraButtons(),
                    direction: 'left',
                    pad: {'r': 10, 't': 10},
                    active: this.rra.getIdx(),
                    showactive: true,
                    type: 'buttons',
                    x: 0.1,
                    xanchor: 'left',
                    y: 1.1,
                    yanchor: 'top'
                }
            ],
            xaxis: {
                autorange: true,
                range: [startDate, endDate],
                rangeslider: {
                    range: [startDate, endDate],
                    // bordercolor: "black",
                    borderwidth: 1
                },
                linecolor: 'black',
                mirror: true,
                type: 'date'
            },
            yaxis: {
                autorange: true,
                linecolor: 'black',
                type: 'linear'
            },
            yaxis2: {
                overlaying: 'y',
                linecolor: 'black',
                side: 'right',
                type: 'linear'
            }
        };
    }

    initRra(idx){
        this.rra = this.rrd.getRRA(idx);
        this.rows = this.rra.getNrRows();
        let step = this.rra.getStep();

        var ts = this.lastUpdate - this.rows*step;
        this.dates = [];


        for(var i=0;i<this.rows;i++){
            this.dates.push(RrdPlotly.date(ts));
            ts+=step;
        }
    }

    initRrd(rrd){
        this.rrd = rrd;
        this.shownDSs = this.getShownDSs();
        this.lastUpdate = rrd.getLastUpdate();
        this.initRra(0);

    }

    plotRrd(){
        this.plotBy(Plotly.newPlot);
        this.plotly.on("plotly_buttonclicked", data => {
            this.initRra(data.button.args[0]);
            this.react();
        });
    }

    react(){
        this.plotBy(Plotly.react);
    }

    plotBy(fn){
        let data = this.createData();
        let layout = this.createLayout();
        fn(this.elementId, data, layout, {
            responsive: true,
            displaylogo: false
        });
    }

    formatTime(s) {
        if (s<60) {
            return s+"s";
        }
        var s60=s%60;
        var m=(s-s60)/60;
        if ((m<10) && (s60>9)) {
            return m+":"+s60+" min";
        }

        if (m<60) {
            return m+" min";
        }

        var m60=m%60;
        var h=(m-m60)/60;
        if ((h<12) && (m60>9)) {
            return h+":"+m60+" hrs";
        }

        if (h<48) {
            return h+" hrs";
        }

        var h24=h%24;
        var d=(h-h24)/24;
        if ((d<7) && (h24>0)) {
            return d+" days "+h24+"h";
        }

        if (d<60) {
            return d+" days";
        }
        var d30=d%30;
        var mt=(d-d30)/30;
        return mt+" months";
    }

    static date(epochTime){
        return new Date(1000*epochTime);
    }
}