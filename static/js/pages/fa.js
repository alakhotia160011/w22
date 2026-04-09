/* ========== FA ========== */
let faData=null;
let faTab='overview';

function switchFATab(tab,btn){
  faTab=tab;
  document.querySelectorAll('.fa-tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(faData)renderFA();
}

async function loadFA(ticker){
  faTab='overview';
  document.querySelectorAll('.fa-tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.fa-tab-btn').classList.add('active');
  const el=document.getElementById('faContent');
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)"><span class="spinner"></span> Loading '+ticker+'...</div>';
  document.getElementById('faLogo').innerHTML='W22 &#9654; FA: '+ticker;
  try{
    const res=await fetch(`${API}/fa/${ticker}`);
    const data=await res.json();
    if(data.error){el.innerHTML=`<div style="padding:40px;color:var(--red)">${data.error}</div>`;return;}
    faData=data;
    document.getElementById('faTagline').textContent=`${data.ratios.name} · ${data.ratios.sector||''} · ${data.ratios.industry||''}`;
    renderFA();
  }catch(e){
    el.innerHTML='<div style="padding:40px;color:var(--red)">Error loading data</div>';
  }
}

function renderFA(){
  const el=document.getElementById('faContent');
  const r=faData.ratios;
  if(faTab==='overview'){
    el.innerHTML=`
      <div class="fa-grid">
        <div class="fa-card">
          <div class="fa-card-title">VALUATION</div>
          <div class="fa-row"><span class="fa-label">Market Cap</span><span class="fa-val">${fmtNum(r.marketCap)}</span></div>
          <div class="fa-row"><span class="fa-label">Trailing P/E</span><span class="fa-val">${fmtRatio(r.trailingPE)}</span></div>
          <div class="fa-row"><span class="fa-label">Forward P/E</span><span class="fa-val">${fmtRatio(r.forwardPE)}</span></div>
          <div class="fa-row"><span class="fa-label">P/B</span><span class="fa-val">${fmtRatio(r.priceToBook)}</span></div>
          <div class="fa-row"><span class="fa-label">P/S</span><span class="fa-val">${fmtRatio(r.priceToSales)}</span></div>
          <div class="fa-row"><span class="fa-label">EV/EBITDA</span><span class="fa-val">${fmtRatio(r.evToEbitda)}</span></div>
          <div class="fa-row"><span class="fa-label">EV/Revenue</span><span class="fa-val">${fmtRatio(r.evToRevenue)}</span></div>
          <div class="fa-row"><span class="fa-label">Beta</span><span class="fa-val">${fmtRatio(r.beta)}</span></div>
        </div>
        <div class="fa-card">
          <div class="fa-card-title">PROFITABILITY</div>
          <div class="fa-row"><span class="fa-label">Revenue</span><span class="fa-val">${fmtNum(r.totalRevenue)}</span></div>
          <div class="fa-row"><span class="fa-label">Net Income</span><span class="fa-val">${fmtNum(r.netIncome)}</span></div>
          <div class="fa-row"><span class="fa-label">EBITDA</span><span class="fa-val">${fmtNum(r.ebitda)}</span></div>
          <div class="fa-row"><span class="fa-label">Free Cash Flow</span><span class="fa-val">${fmtNum(r.freeCashflow)}</span></div>
          <div class="fa-row"><span class="fa-label">Gross Margin</span><span class="fa-val">${fmtPct(r.grossMargins)}</span></div>
          <div class="fa-row"><span class="fa-label">Operating Margin</span><span class="fa-val">${fmtPct(r.operatingMargins)}</span></div>
          <div class="fa-row"><span class="fa-label">Net Margin</span><span class="fa-val">${fmtPct(r.profitMargins)}</span></div>
          <div class="fa-row"><span class="fa-label">Dividend Yield</span><span class="fa-val">${r.dividendYield!=null?fmtPct(r.dividendYield):'--'}</span></div>
        </div>
        <div class="fa-card">
          <div class="fa-card-title">GROWTH & HEALTH</div>
          <div class="fa-row"><span class="fa-label">Revenue Growth</span><span class="fa-val">${fmtPct(r.revenueGrowth)}</span></div>
          <div class="fa-row"><span class="fa-label">Earnings Growth</span><span class="fa-val">${fmtPct(r.earningsGrowth)}</span></div>
          <div class="fa-row"><span class="fa-label">ROE</span><span class="fa-val">${fmtPct(r.returnOnEquity)}</span></div>
          <div class="fa-row"><span class="fa-label">ROA</span><span class="fa-val">${fmtPct(r.returnOnAssets)}</span></div>
          <div class="fa-row"><span class="fa-label">D/E Ratio</span><span class="fa-val">${fmtRatio(r.debtToEquity)}</span></div>
          <div class="fa-row"><span class="fa-label">Current Ratio</span><span class="fa-val">${fmtRatio(r.currentRatio)}</span></div>
          <div class="fa-row"><span class="fa-label">Total Debt</span><span class="fa-val">${fmtNum(r.totalDebt)}</span></div>
          <div class="fa-row"><span class="fa-label">Total Cash</span><span class="fa-val">${fmtNum(r.totalCash)}</span></div>
        </div>
      </div>
      <div class="fa-grid" style="grid-template-columns:1fr 1fr;">
        <div class="fa-card">
          <div class="fa-card-title">52-WEEK RANGE</div>
          <div class="fa-row"><span class="fa-label">52W High</span><span class="fa-val pos">${fmtRatio(r.fiftyTwoWeekHigh)}</span></div>
          <div class="fa-row"><span class="fa-label">52W Low</span><span class="fa-val neg">${fmtRatio(r.fiftyTwoWeekLow)}</span></div>
        </div>
        <div class="fa-card">
          <div class="fa-card-title">COMPANY</div>
          <div class="fa-row"><span class="fa-label">Sector</span><span class="fa-val">${r.sector||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Industry</span><span class="fa-val">${r.industry||'--'}</span></div>
          <div class="fa-row"><span class="fa-label">Employees</span><span class="fa-val">${r.employees?fmtNum(r.employees,0):'--'}</span></div>
        </div>
      </div>`;
  } else {
    // financial statement tab
    const stmtMap={income:faData.income,balance:faData.balance,cashflow:faData.cashflow};
    const titles={income:'INCOME STATEMENT',balance:'BALANCE SHEET',cashflow:'CASH FLOW STATEMENT'};
    const stmt=stmtMap[faTab];
    if(!stmt||!stmt.dates){el.innerHTML='<div style="padding:40px;color:var(--muted)">No data</div>';return;}
    let tbl=`<table class="fa-stmt-table"><thead><tr><th>LINE ITEM</th>`;
    stmt.dates.forEach(d=>{
      const dt=new Date(d+'T12:00:00');
      tbl+=`<th>${fmt_dd_mmm_yy(dt)}</th>`;
    });
    tbl+=`</tr></thead><tbody>`;
    // key line items per statement
    const keyItems={
      income:['Total Revenue','Cost Of Revenue','Gross Profit','Operating Expense','Operating Income',
              'EBITDA','EBIT','Net Interest Income','Interest Expense','Pretax Income',
              'Tax Provision','Net Income','Net Income From Continuing Operation Net Minority Interest',
              'Diluted EPS','Basic EPS','Diluted Average Shares'],
      balance:['Total Assets','Current Assets','Cash And Cash Equivalents','Total Debt','Current Debt',
               'Long Term Debt','Total Liabilities Current','Total Liabilities Net Minority Interest',
               'Stockholders Equity','Common Stock','Retained Earnings','Working Capital',
               'Net Tangible Assets','Invested Capital','Net Debt','Share Issued','Ordinary Shares Number'],
      cashflow:['Operating Cash Flow','Capital Expenditure','Free Cash Flow','Investing Cash Flow',
                'Financing Cash Flow','Repurchase Of Capital Stock','Issuance Of Debt','Repayment Of Debt',
                'Common Stock Dividend Paid','Net Income From Continuing Operations',
                'Depreciation And Amortization','Change In Working Capital',
                'End Cash Position','Beginning Cash Position'],
    };
    const items=keyItems[faTab]||Object.keys(stmt.data);
    items.forEach(item=>{
      const vals=stmt.data[item];
      if(!vals)return;
      tbl+=`<tr><td>${item}</td>`;
      vals.forEach(v=>{
        const cls=v!=null&&v<0?'neg':'';
        tbl+=`<td class="${cls}">${v!=null?fmtNum(v):'--'}</td>`;
      });
      tbl+=`</tr>`;
    });
    tbl+=`</tbody></table>`;
    el.innerHTML=tbl;
  }
}
