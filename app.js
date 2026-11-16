const pages=[...document.querySelectorAll('.page')];
function showPage(id){pages.forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
function auth(mode){document.getElementById('auth').classList.add('active');['login','signup','forgot'].forEach(x=>document.getElementById(x+'-form').classList.toggle('hidden',x!==mode));document.getElementById('tab-login').classList.toggle('selected',mode==='login');document.getElementById('tab-signup').classList.toggle('selected',mode==='signup');document.querySelector('.auth-tabs').classList.toggle('hidden',mode==='forgot');document.getElementById('auth-title').textContent=mode==='signup'?'إنشاء حساب جديد':mode==='forgot'?'استعادة كلمة المرور':'تسجيل الدخول إلى حسابك';showPage('auth');}
document.querySelectorAll('[data-auth]').forEach(b=>b.addEventListener('click',()=>auth(b.dataset.auth)));
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
['login','signup','forgot'].forEach(id=>document.getElementById(id+'-form').addEventListener('submit',e=>{e.preventDefault();if(id==='forgot'){toast('إذا كان البريد مرتبطاً بحساب فستصلك تعليمات إعادة التعيين.');return;}toast('تم قبول النموذج في العرض التجريبي.');setTimeout(()=>showPage('trade'),500);}));
document.getElementById('language').addEventListener('change',e=>{document.documentElement.lang=e.target.value;document.documentElement.dir=e.target.value==='ar'?'rtl':'ltr';toast(e.target.value==='ar'?'تم اختيار العربية':'English selected');});
const amount=document.getElementById('amount');function updatePayout(){document.getElementById('payout').textContent='$'+(Math.max(0,Number(amount.value)||0)*1.87).toFixed(2)}amount.addEventListener('input',updatePayout);document.querySelectorAll('[data-amount]').forEach(b=>b.addEventListener('click',()=>{amount.value=Math.max(1,(Number(amount.value)||1)+Number(b.dataset.amount));updatePayout()}));
document.querySelectorAll('[data-trade]').forEach(b=>b.addEventListener('click',()=>toast('تم تسجيل اختيار '+b.dataset.trade+' في العرض التجريبي فقط.')));
document.querySelectorAll('[data-method]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-method]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.getElementById('chosen-method').textContent='✓　'+b.dataset.method+' · Min $10.00'}));
document.querySelectorAll('[data-percent]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.percent);document.getElementById('deposit-amount').value=n===100?'0.90':(100*n/100).toFixed(2)}));
document.getElementById('pay-demo').addEventListener('click',()=>toast('الإيداع غير متاح في النسخة التجريبية.'));
document.getElementById('support-form').addEventListener('submit',e=>{e.preventDefault();toast('تم حفظ طلب الدعم محلياً للعرض التجريبي.')});document.getElementById('save-profile').addEventListener('click',()=>toast('تم حفظ التغييرات في واجهة العرض فقط.'));
// TradingView Advanced Chart widget. The embedded chart is hosted by TradingView.
(function mountTradingView(){
  const host=document.getElementById('tradingview_chart');
  if(!host) return;
  const script=document.createElement('script');
  script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async=true;
  script.type='text/javascript';
  script.innerHTML=JSON.stringify({
    autosize:true,
    symbol:'OANDA:EURUSD',
    interval:'1',
    timezone:'Asia/Aden',
    theme:'dark',
    style:'1',
    locale:'ar',
    withdateranges:true,
    hide_side_toolbar:false,
    allow_symbol_change:true,
    save_image:true,
    hide_volume:false,
    hide_legend:false,
    hide_top_toolbar:false,
    details:false,
    hotlist:false,
    calendar:false,
    support_host:'https://www.tradingview.com',
    backgroundColor:'#1b2030',
    gridColor:'rgba(65,75,96,0.22)',
    studies:[],
    watchlist:[],
    compareSymbols:[]
  });
  host.appendChild(script);
})();
// Initial page is the trading dashboard; auth forms are available from the account area.

document.getElementById('logout').addEventListener('click',()=>auth('login'));document.getElementById('open-login').addEventListener('click',()=>auth('login'));
