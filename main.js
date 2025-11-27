let tmdbKey = localStorage.getItem('tmdbKey') || '';
let favourites = JSON.parse(localStorage.getItem('favourites') || '[]');
let recently = JSON.parse(localStorage.getItem('recently') || '[]');

let plugins = [];
try {
  const raw = localStorage.getItem('plugins');
  plugins = raw ? JSON.parse(raw) : [];
  if(!Array.isArray(plugins)) plugins = [plugins];
} catch(e){ plugins = []; }

const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.tab-content');
const favContainer = document.getElementById('favs');
const settingsContainer = document.getElementById('settings');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    contents.forEach(c=>c.style.display='none');
    document.getElementById(tab.dataset.tab).style.display=tab.dataset.tab==='settings'? 'block':'grid';
    if(tab.dataset.tab==='movies') loadMovies(movieSearchInput?.value||'');
    if(tab.dataset.tab==='tv') loadTV(tvSearchInput?.value||'');
    if(tab.dataset.tab==='favs') loadFavourites();
  });
});

// TMDB Key input (auto-save)
const tmdbInput = document.getElementById('tmdb-key');
tmdbInput.value = tmdbKey;
tmdbInput.addEventListener('input', ()=>{
  tmdbKey = tmdbInput.value.trim();
  localStorage.setItem('tmdbKey', tmdbKey);
});

// Plugin management UI
const pluginJsonInput = document.createElement('textarea');
pluginJsonInput.id='plugin-json';
pluginJsonInput.placeholder='Enter plugin JSON here';
pluginJsonInput.style.width='100%';
pluginJsonInput.style.height='120px';
settingsContainer.insertBefore(pluginJsonInput, document.getElementById('save-settings'));

const addPluginBtn = document.createElement('button');
addPluginBtn.id = 'add-plugin';
addPluginBtn.textContent = 'Add Plugin';
settingsContainer.insertBefore(addPluginBtn, document.getElementById('save-settings'));

function renderPlugins(){
  let pluginList = settingsContainer.querySelector('#plugin-list');
  if(!pluginList){
    pluginList = document.createElement('div');
    pluginList.id='plugin-list';
    settingsContainer.insertBefore(pluginList, pluginJsonInput);
  }
  pluginList.innerHTML = '';
  if(!plugins || !Array.isArray(plugins)) return;
  plugins.forEach((p,i)=>{
    const div = document.createElement('div');
    div.className='plugin-item';
    div.innerHTML = `
      <span>${p.name}</span>
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    `;
    div.querySelector('.edit-btn').onclick = ()=>{
      pluginJsonInput.value = JSON.stringify(p,null,2);
      addPluginBtn.textContent = 'Update Plugin';
      addPluginBtn.dataset.editIndex = i;
    };
    div.querySelector('.delete-btn').onclick = ()=>{
      plugins.splice(i,1);
      localStorage.setItem('plugins', JSON.stringify(plugins));
      renderPlugins();
    };
    pluginList.appendChild(div);
  });
}

addPluginBtn.onclick = ()=>{
  let json;
  try {
    json = JSON.parse(pluginJsonInput.value);
    if(typeof json !== 'object') throw new Error('Must be an object');
  } catch(e){ return alert('Invalid JSON: '+e.message); }

  if(addPluginBtn.dataset.editIndex !== undefined){
    plugins[addPluginBtn.dataset.editIndex] = json;
    delete addPluginBtn.dataset.editIndex;
    addPluginBtn.textContent = 'Add Plugin';
  } else plugins.push(json);

  localStorage.setItem('plugins', JSON.stringify(plugins));
  pluginJsonInput.value='';
  renderPlugins();
};

renderPlugins();

const api = url => fetch(url).then(r=>r.json());

// Search bar creation
function createSearchBar(containerId, callback){
  let container = document.getElementById(containerId);

  // Remove any existing search bar in this container
  const existing = container.querySelector('.search-bar');
  if(existing) existing.remove();

  const searchDiv = document.createElement('div');
  searchDiv.className = 'search-bar';
  searchDiv.style.width = '100%';
  searchDiv.style.marginBottom = '8px';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search...';
  input.style.width = '100%';
  input.style.padding = '6px';
  input.addEventListener('input', ()=>callback(input.value));

  searchDiv.appendChild(input);
  container.prepend(searchDiv);

  return input;
}

let movieSearchInput, tvSearchInput;

// Load Movies
async function loadMovies(query=''){
  if(!tmdbKey) return;
  let url = query
    ? `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&language=en-US&query=${encodeURIComponent(query)}`
    : `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&language=en-US&page=1`;
  const data = await api(url);
  const container = document.getElementById('movies');
  container.innerHTML='';
  if(!data.results) return;
  data.results.forEach(movie=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML=`<img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
                     <div class="card-title">${movie.title}</div>`;
    card.addEventListener('click', ()=>openDetails(movie,'movie'));
    container.appendChild(card);
  });
}

// Load TV Shows
async function loadTV(query=''){
  if(!tmdbKey) return;
  let url = query
    ? `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&language=en-US&query=${encodeURIComponent(query)}`
    : `https://api.themoviedb.org/3/tv/popular?api_key=${tmdbKey}&language=en-US&page=1`;
  const container = document.getElementById('tv');
  container.innerHTML='';
  const data = await api(url);
  if(!data.results) return;
  data.results.forEach(show=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML=`<img src="https://image.tmdb.org/t/p/w500${show.poster_path}" alt="${show.name}">
                     <div class="card-title">${show.name}</div>`;
    card.addEventListener('click', ()=>openDetails(show,'tv'));
    container.appendChild(card);
  });
}

// Favourites
function loadFavourites(){
  favContainer.innerHTML='';
  favourites.forEach(item=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML=`<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title||item.name}">
                     <div class="card-title">${item.title||item.name}</div>`;
    card.addEventListener('click', ()=>openDetails(item,item.media_type));
    favContainer.appendChild(card);
  });
}

// Modals
const modal = document.getElementById('details-modal');
const playerModal = document.getElementById('player-modal');
modal.querySelector('.close-btn').addEventListener('click',()=>modal.classList.add('hidden'));
playerModal.querySelector('.close-btn').addEventListener('click',()=>{
  playerModal.querySelector('#player-frame').src='';
  playerModal.classList.add('hidden');
});

// Details
async function openDetails(item,type){
  document.getElementById('details-title').textContent = type==='movie'?item.title:item.name;
  document.getElementById('details-overview').textContent = item.overview;
  document.getElementById('details-image').src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;

  const seasonSelect = document.getElementById('season-select');
  const episodeList = document.getElementById('episode-list');
  const pluginSelect = document.getElementById('plugin-select');

  episodeList.innerHTML='';
  pluginSelect.innerHTML='';

  if(plugins.length>1){
    pluginSelect.classList.remove('hidden');
    plugins.forEach((p,i)=>{
      const opt = document.createElement('option'); opt.value=i; opt.textContent=p.name;
      pluginSelect.appendChild(opt);
    });
  } else pluginSelect.classList.add('hidden');

  if(type==='tv'){
    const showData = await api(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${tmdbKey}&language=en-US`);
    seasonSelect.innerHTML='';
    showData.seasons.forEach(s=>{
      const opt = document.createElement('option'); opt.value=s.season_number; opt.textContent=s.name;
      seasonSelect.appendChild(opt);
    });
    seasonSelect.onchange = async()=>{
      const sel = seasonSelect.value;
      const eps = await api(`https://api.themoviedb.org/3/tv/${item.id}/season/${sel}?api_key=${tmdbKey}&language=en-US`);
      episodeList.innerHTML='';
      eps.episodes.forEach(ep=>{
        const li = document.createElement('li'); li.textContent=ep.name;
        li.onclick = ()=>playEpisode(item.id,sel,ep.episode_number,type);
        episodeList.appendChild(li);
      });
    };
    seasonSelect.onchange();
  } else { seasonSelect.innerHTML=''; episodeList.innerHTML=''; }

  document.getElementById('play-episode').onclick = ()=>playEpisode(item.id,seasonSelect.value||1,1,type);

  if(!favourites.some(f=>f.id===item.id)) favourites.push({...item, media_type:type});
  localStorage.setItem('favourites', JSON.stringify(favourites));

  modal.classList.remove('hidden');
}

// Play episode/movie
function playEpisode(id, season, episode, type){
  if(!plugins || plugins.length === 0) return alert('No plugin configured');

  let plugin;
  const pluginSelect = document.getElementById('plugin-select');
  if(!pluginSelect.classList.contains('hidden')){
    const selIndex = parseInt(pluginSelect.value);
    plugin = plugins[selIndex] || plugins[0];
  } else {
    plugin = plugins[0];
  }
  if(!plugin) return alert('No valid plugin');

  let url;
  if(type==='tv'){
    if(!plugin.tv_url) return alert('Selected plugin has no tv_url');
    url = plugin.tv_url
      .replace('{id}', id)
      .replace('{tmdb}', id)
      .replace('{season}', season)
      .replace('{episode}', episode);
  } else {
    if(!plugin.url) return alert('Selected plugin has no url');
    url = plugin.url.replace('{id}', id);
  }

  const frame = playerModal.querySelector('#player-frame');
  frame.src = url;
  playerModal.classList.remove('hidden');

  if(!recently.some(r=>r.id===id)) {
    const favItem = favourites.find(f=>f.id===id) || {id, media_type:type};
    recently.push({...favItem});
    localStorage.setItem('recently', JSON.stringify(recently));
  }
}

// Safe window.onload: no redirects
window.onload = ()=>{
  renderPlugins();

  // Add search bars **inside correct containers**
  movieSearchInput = createSearchBar('movies', (val)=>loadMovies(val));
  tvSearchInput = createSearchBar('tv', (val)=>loadTV(val));

  // Load initial data
  loadMovies();
  loadTV();
};
