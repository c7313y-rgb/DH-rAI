const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const byId = id => document.getElementById(id);
const num = id => Number(byId(id).value) || 0;
const fmt = value => Math.round(value).toLocaleString('ja-JP');
const clamp = (value, min = 45, max = 98) => Math.max(min, Math.min(max, value));

const layerDefs = [
  ['立地条件','location','#176cdd'],['敷地','site','#168bcb'],['建物','building','#10a7b5'],
  ['交通事情','traffic','#18a16f'],['商圏','market','#64aa55'],['トレンド','trend','#e0a12b'],['類似・歴史','history','#865fc5']
];
const baseDemand = [
  {name:'ドラッグストア＋調剤',cat:'retail',base:94,desc:'人口増加、医療施設集積、競合空白、生活導線との整合が高い',tags:['生活密着','長期契約','成長業態'],sales:4800,ratio:4.7,payback:4.3},
  {name:'ファミリー型焼肉・外食',cat:'food',base:91,desc:'休日交通量、駐車場、ファミリー世帯比率、類似店実績が良好',tags:['週末賑わい','高月商','夜間需要'],sales:4300,ratio:5.1,payback:4.8},
  {name:'ライフスタイル雑貨＋カフェ',cat:'retail',base:88,desc:'滞在型消費と回遊性を高め、施設全体の目的来店をつくりやすい',tags:['体験消費','回遊促進','SNS親和'],sales:3200,ratio:5.5,payback:4.5},
  {name:'キッズ・ファミリー体験施設',cat:'service',base:85,desc:'子育て世帯と休日需要が強く、飲食・物販への波及効果も期待',tags:['体験型','ファミリー','滞在時間'],sales:1850,ratio:6.7,payback:5.2},
  {name:'食品スーパー＋専門店',cat:'retail',base:83,desc:'日常利用を核に専門店への回遊を生む。搬入動線と競合価格は要確認',tags:['核テナント','高頻度','回遊効果'],sales:6200,ratio:3.8,payback:5.7},
  {name:'カフェ・ベーカリー複合',cat:'food',base:79,desc:'テラスとイベント広場の相乗効果が高く、夕方の滞在需要にも適合',tags:['テラス','地域交流','夕方需要'],sales:1950,ratio:7.1,payback:5.8}
];
let demand = [...baseDemand];
let state = {score:86,sales:4180,fair:211,confidence:86,layers:{}};

let toastTimer;
function showToast(title, detail = '分析結果を保存しました') {
  byId('toast').querySelector('b').textContent = title;
  byId('toast').querySelector('p').textContent = detail;
  byId('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => byId('toast').classList.remove('show'), 2800);
}
function setDrawer(open) {
  byId('analysisDrawer').classList.toggle('open', open);
  byId('drawerBackdrop').classList.toggle('show', open);
  byId('analysisDrawer').setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
}
function setChat(open) {
  byId('aiChat').classList.toggle('open', open);
  byId('aiChat').setAttribute('aria-hidden', String(!open));
  byId('floatingAi').style.opacity = open ? '0' : '1';
  if (open) setTimeout(() => byId('chatInput').focus(), 120);
}

function calculate() {
  const site = num('siteArea'), building = num('buildingArea'), parking = num('parking');
  const traffic = num('traffic'), population = num('population'), rent = num('rent');
  const station = num('station'), age = num('age'), growth = num('growth');
  const scores = {
    location:clamp(72 + growth*3 - station*.7), site:clamp(58 + site/60 + parking*.35),
    building:clamp(90 - age*.75 + Math.min(building/180,5)), traffic:clamp(55 + traffic/520 + parking*.18),
    market:clamp(58 + population/2600 + growth*2), trend:clamp(70 + growth*4), history:clamp(79 + Math.min(population/15000,6))
  };
  const weights = {location:.16,site:.13,building:.12,traffic:.17,market:.19,trend:.12,history:.11};
  const score = Math.round(Object.keys(scores).reduce((sum,key) => sum + scores[key]*weights[key], 0));
  const baseSales = population*.021 + traffic*.075 + parking*17 + building*.72 + growth*90;
  const sales = Math.round(baseSales/10)*10;
  const fair = Math.round(sales*.0505 + site*.004 + parking*.18);
  const confidence = Math.round(clamp(70 + Math.min(population/8000,9) + Math.min(traffic/5000,5) + Math.min(growth,4),70,94));
  state = {score,sales,fair,confidence,layers:scores};
  updateUI(rent);
}

function updateUI(rent) {
  const {score,sales,fair,confidence,layers} = state;
  byId('totalScore').textContent = score;
  byId('ring').style.background = `conic-gradient(var(--green) 0 ${score*3.6}deg,#e5ebf0 ${score*3.6}deg)`;
  byId('grade').textContent = score >= 88 ? 'A+' : score >= 83 ? 'A' : score >= 76 ? 'B+' : 'B';
  const low = Math.round(sales*.87/10)*10, high = Math.round(sales*1.14/10)*10;
  const rentLow = Math.round(fair*.93), rentHigh = Math.round(fair*1.06);
  byId('salesLow').textContent = fmt(low)+'万円'; byId('salesMid').textContent = fmt(sales)+'万円'; byId('salesHigh').textContent = fmt(high)+'万円';
  byId('heroSales').innerHTML = `${fmt(sales)}<em>万円/月</em>`;
  byId('heroRent').innerHTML = `${fmt(rentLow)}〜${fmt(rentHigh)}<em>万円</em>`;
  byId('fairRent').textContent = `${fmt(rentLow)}〜${fmt(rentHigh)}万円`;
  byId('confidenceText').textContent = confidence+'%'; byId('confidenceBar').style.width = confidence+'%'; byId('heroConfidence').innerHTML = `${confidence}<em>%</em>`;
  byId('decisionTitle').textContent = score >= 83 ? '積極提案' : score >= 75 ? '条件調整後に提案' : '用途再検討';
  byId('decisionText').textContent = rent > rentHigh ? `立地需要は強い一方、希望賃料は適正上限を${fmt(rent-rentHigh)}万円超過。条件調整で成約確率が改善します。` : '立地・商圏・交通の整合が高く、現行条件でも複数業態への提案余地があります。';
  byId('mapProperty').textContent = byId('property').value; byId('mapAddress').textContent = byId('address').value;
  byId('mapSite').textContent = fmt(num('siteArea'))+'㎡'; byId('mapParking').textContent = fmt(num('parking'))+'台'; byId('mapTraffic').textContent = fmt(num('traffic'))+'台/日';
  renderLayers(layers); renderEvidence(layers); renderCases(sales); renderDemand(score,sales,fair); renderEconomics(fair,rent); renderActions(fair,rent,score);
}
function renderLayers(scores) {
  byId('layers').innerHTML = layerDefs.map(([label,key,color]) => `<div class="layer" style="--bar:${color}"><small>${label}</small><b>${Math.round(scores[key])}</b><span>${scores[key]>=85?'強い追い風':scores[key]>=75?'良好':'要改善'}</span></div>`).join('');
}
function renderEvidence(scores) {
  const items = [
    ['立地','広域商業集積と住宅開発の双方に近く、目的来店と日常利用を両立',scores.location],
    ['交通','前面交通量と駐車容量が基準を満たし、週末の賑わいを支える',scores.traffic],
    ['商圏','3km人口と世帯増加率が安定し、ファミリー消費が見込める',scores.market],
    ['トレンド','体験型・滞在型・食の複合業態への出店意欲が高い',scores.trend],
    ['類似・歴史','近隣類似施設で生活密着業態の定着実績がある',scores.history]
  ];
  byId('evidenceList').innerHTML = items.map((item,index) => `<div class="evidence"><div class="evidence-icon">${index+1}</div><div><b>${item[0]}</b><p>${item[1]}</p></div><span class="impact">+${Math.round((item[2]-60)/5)}%</span></div>`).join('');
}
function renderCases(sales) {
  const cases = [['本物件',sales,sales],['郊外A',sales*.93,sales*.89],['近郊B',sales*.88,sales*.91],['商業C',sales*1.04,sales*.98],['住宅D',sales*.81,sales*.84]];
  byId('caseChart').innerHTML = cases.map(item => `<div class="case"><div class="bars"><i style="height:${Math.min(132,item[1]/35)}px"></i><i style="height:${Math.min(132,item[2]/35)}px"></i></div><small>${item[0]}</small></div>`).join('');
}
function renderDemand(score,sales,fair,filter='all') {
  demand = baseDemand.map((item,index) => ({...item,score:Math.round(clamp(item.base+(score-86)*.35-(index===5&&fair>220?3:0))),sales:Math.round(item.sales*(sales/4180)/10)*10})).sort((a,b)=>b.score-a.score);
  const rows = demand.filter(item => filter==='all' || item.cat===filter);
  byId('demandGrid').innerHTML = rows.map((item,index) => `<article class="demand"><div class="demand-top"><div class="rank">${index+1}</div><div class="demand-score">${item.score}</div></div><h3>${item.name}</h3><p>${item.desc}</p><div class="chips">${item.tags.map(tag=>`<span class="chip">${tag}</span>`).join('')}</div><div class="heat"><span>出店ニーズ</span><div><i style="width:${item.score}%"></i></div><b>${item.score}</b></div><div class="heat"><span>物件適合</span><div><i style="width:${Math.max(60,item.score-4)}%"></i></div><b>${Math.max(60,item.score-4)}</b></div></article>`).join('');
  byId('heroType').textContent = demand[0].name;
}
function renderEconomics(fair,rent) {
  const low=Math.round(fair*.93), high=Math.round(fair*1.06), min=Math.round(fair*.87), max=Math.round(fair*1.13);
  byId('deposit').textContent = `${fmt(low*6)}〜${fmt(high*10)}万円`; byId('freeRent').textContent = rent>high?'3〜5か月':'2〜4か月'; byId('payback').textContent = rent>high?'4.8〜6.2年':'4.2〜5.6年';
  byId('rangeLow').textContent=fmt(min)+'万円'; byId('rangeBest').textContent=fmt(fair)+'万円'; byId('rangeHigh').textContent=fmt(max)+'万円';
  byId('rentMarker').style.left = Math.max(3,Math.min(97,(rent-min)/(max-min)*100))+'%';
  byId('economicsTable').innerHTML = demand.slice(0,5).map(item => {const appropriate=Math.round(item.sales*item.ratio/100);return `<tr><td>${item.name}</td><td><b>${fmt(item.sales)}万円</b></td><td>${fmt(Math.round(appropriate*.94))}〜${fmt(Math.round(appropriate*1.05))}万円</td><td>${item.ratio.toFixed(1)}%</td><td>${item.payback.toFixed(1)}年</td></tr>`}).join('');
}
function renderActions(fair,rent,score) {
  const gap=rent-fair;
  const actions=[
    ['上位3業態へ同時提案','売上予測・賑わい創出効果・条件案を1枚にして48時間以内に打診','最優先'],
    [gap>0?'賃料条件を二段階提示':'現行賃料を維持',gap>0?`基準${fmt(fair)}万円と上限${fmt(Math.round(fair*1.06))}万円で反応比較`:'初期投資のみ調整し賃料水準を守る','高'],
    ['施設全体の回遊効果を提示','飲食・物販・体験型の組み合わせで滞在時間を伸ばす','高'],
    ['週末イベントを提案','開業初月の集客施策を出店条件と合わせて提示','中']
  ];
  byId('actionsList').innerHTML = actions.map((item,index)=>`<div class="action-item"><div class="action-no">${index+1}</div><div><b>${item[0]}</b><p>${item[1]}</p></div><span class="priority">${item[2]}</span></div>`).join('');
  const top=demand[0];
  byId('talkTrack').innerHTML = `<b>提案の切り口：</b><br>本物件は3km商圏人口、週末交通量、駐車容量を総合すると、${top.name}で月商約${fmt(top.sales)}万円が見込めます。飲食・物販・体験型の回遊を組み合わせることで、施設全体の滞在時間と賑わい向上も期待できます。<br><br><b>条件提示：</b><br>適正賃料は月額${fmt(Math.round(fair*.93))}〜${fmt(Math.round(fair*1.06))}万円。開業イベント支援とフリーレントを組み合わせた複数案をご提示します。`;
}

function createReport() {
  const top=demand.slice(0,3).map((item,index)=>`${index+1}. ${item.name}（需要・適合 ${item.score}点、月商予測 ${fmt(item.sales)}万円）`).join('\n');
  byId('report').textContent = `【LOCATION SALES AI｜営業判断レポート】\n\n対象物件：${byId('property').value}\n所在地：${byId('address').value}\n総合事業性：${state.score}/100\n予測信頼度：${state.confidence}%\n\n■売上予測\n保守：${byId('salesLow').textContent}\n基準：${byId('salesMid').textContent}\n上振れ：${byId('salesHigh').textContent}\n\n■推奨業種・業態\n${top}\n\n■適正経済条件\n賃料：${byId('fairRent').textContent}\n保証金：${byId('deposit').textContent}\nフリーレント：${byId('freeRent').textContent}\n投資回収：${byId('payback').textContent}\n\n■賑わい創出提案\n生活密着型を核に、飲食・体験型・週末イベントを組み合わせることで、日常利用と目的来店の双方を獲得する。テラス・広場・回遊動線を活用し、夕方以降も滞在したくなる施設づくりを推奨する。\n\n■総合所見\n立地、敷地、建物、交通事情、商圏、トレンド、類似事例・地域履歴を統合すると、生活密着型と自動車来店型業態への適合が高い。上位3業態へ根拠資料と複数の経済条件案を提示し、反応を比較することを推奨する。\n\n※デモ数値です。本番では社内実績および外部データを接続します。`;
  byId('reportDialog').showModal();
}

function appendMessage(text,user=false) {
  const message=document.createElement('div'); message.className=`message ${user?'user':'ai'}`;
  if(!user){const icon=document.createElement('span');icon.textContent='✦';message.append(icon)}
  const body=document.createElement('div'); body.textContent=text; message.append(body); byId('chatBody').append(message); byId('chatBody').scrollTop=byId('chatBody').scrollHeight;
}
const replies=['上位3業態では、ドラッグ＋調剤が安定集客、ファミリー外食が夜間の賑わい、ライフスタイル雑貨＋カフェが回遊性向上に最も寄与します。','賃料は211万円を基準案、224万円を上限案として提示し、開業イベント支援とフリーレントを組み合わせると交渉しやすくなります。','類似5事例では、テラス・イベント広場・食の集積がある施設ほど週末滞在時間が平均18%長い傾向です。']; let replyIndex=0;
function sendChat(text){const clean=text.trim();if(!clean)return;appendMessage(clean,true);byId('chatInput').value='';const thinking=document.createElement('div');thinking.className='message ai thinking';thinking.innerHTML='<span>✦</span><div>立地・商圏・類似事例を確認中…</div>';byId('chatBody').append(thinking);setTimeout(()=>{thinking.remove();appendMessage(replies[replyIndex++%replies.length])},650)}

byId('analysisForm').addEventListener('submit',event=>{event.preventDefault();calculate();setDrawer(false);showToast('統合AI診断を更新しました','7層評価と営業アクションを再計算しました')});
byId('newAnalysis').onclick=()=>setDrawer(true); byId('editConditions').onclick=()=>setDrawer(true); byId('heroAnalyze').onclick=()=>setDrawer(true); byId('sampleBtn').onclick=()=>location.reload();
byId('drawerBackdrop').onclick=()=>setDrawer(false); $('.drawer-close').onclick=()=>setDrawer(false);
byId('floatingAi').onclick=()=>setChat(true); byId('agentBtn').onclick=()=>setChat(true); byId('chatClose').onclick=()=>setChat(false);
byId('chatForm').addEventListener('submit',event=>{event.preventDefault();sendChat(byId('chatInput').value)}); $$('.suggestions button').forEach(button=>button.onclick=()=>sendChat(button.textContent));
byId('heroReport').onclick=createReport; byId('briefReport').onclick=createReport; byId('reportBtn').onclick=createReport; byId('reportNav').onclick=createReport;
byId('copy').onclick=async()=>{try{await navigator.clipboard.writeText(byId('report').textContent);showToast('レポートをコピーしました','社内システムやメールに貼り付けられます')}catch{showToast('コピーできませんでした','ブラウザの権限をご確認ください')}}; byId('print').onclick=()=>window.print();
byId('deepAnalysis').onclick=()=>byId('evidence').scrollIntoView({behavior:'smooth'}); byId('compareCase').onclick=()=>showToast('類似事例比較を表示中','同規模・同商圏の5事例を比較しています');
$$('.tab').forEach(button=>button.onclick=()=>{$$('.tab').forEach(item=>item.classList.remove('on'));button.classList.add('on');renderDemand(state.score,state.sales,state.fair,button.dataset.filter)});
$$('[data-target]').forEach(button=>button.onclick=()=>{$$('.nav-item').forEach(item=>item.classList.remove('active'));const nav=$(`.nav-item[data-target="${button.dataset.target}"]`);if(nav)nav.classList.add('active');byId(button.dataset.target).scrollIntoView({behavior:'smooth'});byId('sidebar').classList.remove('open')});
$$('[data-action]').forEach(button=>button.onclick=()=>{const action=button.dataset.action;if(action==='help')setChat(true);else if(action==='alerts')showToast('2件の確認事項があります','希望賃料と競合出店情報をご確認ください');else if(action==='sources')showToast('データソースは正常です','物件DB・商圏統計・交通量は最新です');else showToast('分析設定','郊外型商業施設モードで稼働中です')});
byId('menuToggle').onclick=()=>byId('sidebar').classList.toggle('open');
byId('quickSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){byId('property').value=event.target.value||byId('property').value;setDrawer(true)}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){setDrawer(false);setChat(false);byId('sidebar').classList.remove('open')}});
calculate(); setTimeout(()=>showToast('週末賑わいシグナルを検知','飲食・体験型を加えると滞在時間が18%向上する予測です'),900);
