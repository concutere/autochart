const splitters = [',', '.', ' '];
const useCols = [0,4,5];
const maxSymbolLen = 5; //TODO better symbol tokenizing
let _monthStart = '2017-06';
let _monthSpan = 1;
var lastSymbol;

document.getElementById('symbol').addEventListener('keyup', checkSymbol);
document.getElementById('symbol').addEventListener('keydown', (e) => {
  if (e instanceof KeyboardEvent && e.key === 'Enter') {
    e.preventDefault();
    return false;
  }
});

function checkSymbol(e) {
  if (e instanceof KeyboardEvent) {
    if(e.key === 'Enter') {
      goFetch(e.target.innerText);
      lastSymbol = e.target.innerText;
      return false;
    }
    else if ([8,46].indexOf(e.keyCode) !== -1) { 
      let last = getSymbols(lastSymbol);
      let curr = getSymbols();
      let currLens = curr.map((v) => { return v.length;});
      if(last.length !== curr.length && Math.max(...currLens) <= maxSymbolLen) {
        //console.log(e);
        goFetch(e.target.innerText);
        lastSymbol = e.target.innerText;
      }
    }
    else if (splitters.indexOf(e.key) > -1) {
      splitFetch(e.target.innerText);
      lastSymbol = e.target.innerText;
    }
    return true;
  }
} 

function getSplitter(txt) {
  return splitters.reduce((acc,v,i) => {
    if(txt.indexOf(v) > -1) {
      return v;
    }
    else {
      return acc;
    }
  });
}

function clearContent() {
  let content = document.getElementById('content');
  while (content.firstChild) {
    content.removeChild(content.firstChild);
  }
}

function clearExcept(except) {
  let content = document.getElementById('content');
  let found = 0;
  while(content.children.length > except.length) {
    let c = content.children[found];
    if (except.indexOf(c.id) > -1) {
      found++;
    }
    else {
      content.removeChild(c);
    }
  }
  return Array.prototype.map.call(content.children, (v) => {
    return v.id;
  });
}

function goFetch(sy) {
  clearContent();
  if (getSplitter(sy) !== undefined) {
    splitFetch(sy);
  }
  else {
    //console.log(sy);
    getData(sy,dateStart(), dateEnd(), (d) => {tableData(d.column_names, d.data)});
  }
}

function getSymbols(systr) {
  if(systr === undefined) {
    systr = document.getElementById('symbol').innerText;
  }
  let splitter = splitters.reduce((acc,v,i) => {
    if(systr.indexOf(v) > -1) {
      return v;
    }
    else {
      return acc;
    }
  });
  return systr.split(splitter).map((s,i) => {
    let ss = s.trim();
    splitters.forEach((p) => {
      ss=ss.replace(p,'');
    });
    return ss;
  }).filter((v) => v !== '');
}

function splitFetch(systr) {
  //let already = clearExcept(systr);
  clearContent();
  let symbols = getSymbols(systr);
  symbols.sort();
  //console.log(symbols);
  let colorscale = getColorScale(symbols.length);
  symbols.forEach((s,i) => {
    //if (already.indexOf(s) === -1) {
      getData(s, dateStart(), dateEnd(), (d) => {
        let content = document.getElementById('content');
        let table = document.createElement('table');
        table.id = s;
        table.style.backgroundColor = colorscale[i];
        content.appendChild(table);
        tableData(d.column_names, d.data, table);
        if (i === 0) {
          let colopts = document.getElementById('colopts');
          if(colopts.children.length === 0) {
            d.column_names.forEach((c,i) => {
              let el = document.createElement('div');
              el.id = `colopt${i}`;
              el.innerText = c;
              el.addEventListener('click',(e) => toggleUsed(e.target.id.substr(6)));
              if(useCols.indexOf(i) === -1) {
                el.className = 'unused';
              }
              colopts.appendChild(el);
            });
          }
        }
        if(content.children.length === symbols.length) {
          visData(symbols);
        }
      });
    /*}
    else {
      document.getElementById(s).style.backgroundColor = colorscale[i];
    }*/
  });

  return true;
}

function refetch() {
  goFetch(document.getElementById('symbol').innerText);
}

function toggleUsed(i) {
  i = parseInt(i);
  let idx = useCols.indexOf(i);
  if (idx === -1) {
    useCols.push(i);
    useCols.sort((a,b) => {return a > b;});
    document.getElementById(`colopt${i}`).className = '';
    //console.log(`using ${i}`)
  }
  else {
    useCols.splice(idx,1);
    document.getElementById(`colopt${i}`).className = 'unused';
    //console.log(`not using ${i}`)
  }
  refetch();
}

function tableData(columns, matrix, el) {
  if (el===undefined) {
     el = document.createElement('table');
     document.getElementById('content').appendChild(el);
  }
  let colheads = '';
  columns.forEach((v,i) => {
    if (useCols.indexOf(i) !== -1) {
      colheads += `<th id="${i}">${v}</th>`;
    }
  })
  let syrow = el.id !== '' ?  `<tr><th colspan="${useCols.length}">${el.id.toLocaleUpperCase()}</th></tr>` : '';
  let head = `<thead>${syrow}<tr>${colheads}</tr></thead>`;

  let rows = [];
  matrix.forEach((v,i) => {
    let row = `<tr id="${i}">
      ${v.map((vv,ii) => {
        if (useCols.indexOf(ii) !== -1) {
          let style = columns[ii]==='Date' ? ' style="text-align:center" ':' ';
          return `<td id="${i}-${ii}" ${style}>${vv}</td>`;
        }
      }).join('')}
      </tr>`;
    rows.push(row);
  });
  el.innerHTML = `${head}<tbody>${rows.join('')}</tbody>`;
}

function getColorScale(len) {
  return Hsl.seq5ths(new Hsl(222,33,66),len,4);
}

function visData(symbols) {
  if (symbols === undefined) {
    symbols = getSymbols();
  }
  let dataValues = [];
  let colNames;
  
  symbols.forEach((symbol) => {
    let dataset = fetched[getQuery(symbol,dateStart(),dateEnd())];
    colNames = dataset.column_names;
    let data = dataset.data;
    data.forEach((row) => {
      let values = {'Symbol':symbol};
      useCols.forEach((c) => {
        values[colNames[c].replace('.','').replace(' ','')] = row[c];
      });
      dataValues.push(values);
    });
  });

  if(useCols.length > 1) {
    //assume date, use next avail for Y
    let yField = colNames[useCols[1]].replace('.','').replace(' ','');
    let transforms = [];
    if (useCols.length >= 3) {
      let zFields = useCols.slice(2).map((c) => { return colNames[c].replace('.','').replace(' ',''); });
      let calcField = `datum.${yField} * datum.${zFields.join(' * datum.')}`; /*.reduce((acc,field) => {
        if(acc===undefined || acc.length < 1) { 
          return `datum.${yField} * datum.${field}`;
        }
        else {
          return `${acc} * datum.${field}`;
        }
      });*/
      let asField = `${yField}*${zFields.join('*')}`;
      transforms.push({"calculate":calcField, "as": asField});
      yField = asField;
    }

    let colorscale = getColorScale(symbols.length);
    
    let visbox = document.getElementById('visbox');
    let vlSpec = {
      "$schema": "https://vega.github.io/schema/vega-lite/v2.0.json",
      "description": "autochart prototyping with vega!",
      "width":visbox.clientWidth,
      "height":visbox.clientHeight,
      "autosize":{
        "type":"fit",
        "contains":"padding"
      },
      "data": {
        "values": dataValues
      },
      "transform": transforms,
      "mark": "line",
      "encoding": {
        "x": {"field": "Date", "type": "temporal", "axis": {"grid":false}},
        "y": {"field": yField, "type": "quantitative", "axis": {"grid":false}},
        "color": {"field": "Symbol", "type": "nominal","scale":{"range":colorscale}}
      }
    };
    vega.embed("#visbox", vlSpec, {"actions":false});
  }
}

////////////////////////////////////


class Hsl {
  constructor(h, s, l) {
    this.h = h;
    this.s = s;
    this.l = l;
  }

  static strHsl(hsl) {
    var str = `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`;
    return str;
  }

  toString() {
    return Hsl.strHsl(this);
  }

  toJson() {
    return {h:this.h, s:this.s, l:this.l};
  }

  static circle5th(hsl,base=2, inc) {
    if(inc===undefined) {
      inc = Math.pow(base,3) % 360;
      //let diff = (6 - (base));
      //inc = Math.max(6,base * Math.pow(diff,2));
      //console.log(`inc:${inc}`);
    }
    var steps = 360/inc;
    var stepBy = Math.floor(steps / Math.max(1,base)) + 1;
    var step = stepBy * inc;
return new Hsl(
      (hsl.h + step) % 360,
      hsl.s,
      hsl.l
    );
  }

  static seq5ths(hsl,n,base,inc) {
    let seq = [hsl.toString()];
    while(seq.length < n) {
      hsl = Hsl.circle5th(hsl,base,inc);
      seq.push(hsl.toString());
    }
    //console.log(seq);
    return seq;
  }
}


////////////////////////////////////////////

function dateboxEventInit() {
  let datebox = document.getElementById('datebox');
  datebox.addEventListener('click', (e) => {
    console.log(e);
    switch(e.target.id) {
      case 'datebox-back':
        dateBack();
        break;
      case 'datebox-next':
        dateNext();
        break;
      case 'datebox-up':
        dateUp();
        break;
      case 'datebox-down':
        dateDown();
        break;
    }
    return false;
  })
}

function dateStart() {
  return _monthStart + '-01';
}
function dateEnd() {
  let dateParts = _monthStart.split('-');
  let cm = parseInt(dateParts[1]);
  let em = cm + _monthSpan;
  let yr = parseInt(dateParts[0]);
  if (em > 12) {
    yr++;
    em = em % 12;
  }
  return `${yr}-${em}-01`;
}

function dateBack() {
  let dateParts = _monthStart.split('-');
  let cm = parseInt(dateParts[1]);
  let nm = cm - 1;
  let yr = parseInt(dateParts[0]);
  if (nm < 1) {
    yr--;
    nm = 12;
  }

  _monthStart = `${yr}-${nm}`;
  redate();
}

function dateNext() {
  let dateParts = _monthStart.split('-');
  let cm = parseInt(dateParts[1]);
  let nm = cm + 1;
  let yr = parseInt(dateParts[0]);
  if (nm > 12) {
    yr++;
    nm = nm % 12;
  }

  _monthStart = `${yr}-${nm}`;
  redate();
}

function dateUp() {
  if (_monthSpan === 1) {
    _monthSpan = 3;
  } 
  else if (_monthSpan === 3) {
    _monthSpan = 6;
  }
  else if (_monthSpan === 6) {
    _monthSpan = 12;
  }
  else {
    _monthSpan = 1;
  }
  redate();
}

function dateDown() {
  if(_monthSpan === 12) {
    _monthSpan = 6;
  }
  else if (_monthSpan === 6) {
    _monthSpan = 3;
  }
  else {
    _monthSpan = 1;
  }
  redate();
}

function monthName(moNum) { //moNum 1-based
  let names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (!isNaN(moNum) && moNum > 0 && moNum <= 12) {
    return names[moNum-1];
  }
  else {
    return 'N/A';
  }
}

function redate() {
  let dateParts = _monthStart.split('-');
  let mo = parseInt(dateParts[1]);
  let moname = monthName(mo);
  let year = dateParts[0];
  document.getElementById('datebox-date').innerText = `${moname} ${year} +${_monthSpan}`;
  refetch();
}

dateboxEventInit();
