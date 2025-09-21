let user = "herrstrietzel";
let exclude = [`${user}.github.io`];
let url = `https://api.github.com/users/${user}/repos?per_page=50&sort=updated`;
let storageName = "githubRepoCache" + user;
let flush = false;

(async () => {
  // get data
  let data = await getRepoData(url, exclude, storageName, true);
  

  //render
  let { with_page, only_repo } = data;
  //console.log(data)

  // render
  renderRepoList(with_page, repos_with_demos);
  renderRepoList(only_repo, repolist_other);

})();


function renderRepoList(repos = [], target = null) {
  let html = "";
  repos.forEach((repo) => {
    html += getRepoSummary(repo);
  });

  target.insertAdjacentHTML("beforeend", html);
}


async function getRepoData(url, exclude, storageName, flush = false) {
  let dataCache = localStorage.getItem(storageName)
    ? JSON.parse(localStorage.getItem(storageName))
    : null;
  let age = dataCache
    ? (new Date().getTime() - dataCache.timestamp) / 1000 / 360
    : 1000;

  //console.log("dataCache", storageName,  dataCache, "age", age);

  // use caches data if not expired
  if (!flush && dataCache && age < 3) return dataCache;

  let res = await fetch(url);

  if (res.ok) {
    let data = await res.json();

    // filter out forks
    data = data.filter((repo) => {
      return !exclude.includes(repo.name);
    });
    data = data.filter((repo) => {
      return !repo.fork;
    });
    
    
    // build simplified data object and save to storage
    dataCache = await setCache(data, storageName);
    
    // sort by stars
    dataCache.only_repo.sort((a,b) => b.stargazers_count - a.stargazers_count); 
    dataCache.with_page.sort((a,b) => b.stargazers_count - a.stargazers_count); 

    return dataCache;
  } else{
    return dataCache;
  }
}

/**
 * reduce object
 * create cache
 */
async function setCache(data, storageName = "githubCache") {
  let props = [
    "name",
    "description",
    "homepage",
    "topics",
    "stargazers_count",
    "html_url",
  ];
  let dataMin = {
    timestamp: new Date().getTime(),
    with_page: [],
    only_repo: []
  };

  for (let i = 0; i < data.length; i++) {
    let repo = data[i];
    let repo_red = {favicon:''};
    for (let prop of props) {
      repo_red[prop] = repo[prop];
    }

    if (repo_red.homepage) {
      //check favicons
      let favicon = repo_red.homepage + '/favicon.svg'.replaceAll('//favicon.svg', '/favicon.svg');
       favicon = favicon.replaceAll('//favicon.svg', '/favicon.svg');
      let res = await fetch(favicon);
      
      console.log('favicon', favicon)
      if(res.ok){
        repo_red.favicon = favicon
      }

      dataMin.with_page.push(repo_red);
    } else {
      dataMin.only_repo.push(repo_red);
    }
  }
  let json = JSON.stringify(dataMin);
  localStorage.setItem(storageName, json);
  //console.log("dataMin", dataMin);

  return dataMin;
}

// buid list HTML
function getRepoSummary(repo) {
  let markup = "";

  let {
    name,
    description,
    homepage,
    topics,
    stargazers_count,
    html_url,
    favicon
  } = repo;
  
  let stars = stargazers_count ? `<span class="span-stars">(${stargazers_count} stars)</span>` : '';
  let faviconImg = favicon ? `<img class="img-favicon" src="${favicon}" alt="${name} favicon">` : '';
  
  markup += `<li class="li-repo">
      <h3 class="h3">${faviconImg}${name} ${stars}</h3>`;

  let tagList = "";
  if (topics.length) {
    topics.forEach((topic) => {
      tagList += `<span class="span-topic">${topic}</span>`;
    });
    markup += `<p class="p-tags">${tagList}</p>`;
  }

  markup += `<p class="p-desciption">${description}</p>
      <p class="p-link">`;

  if (homepage) {
    markup += `<a class="a-demo" rel="noopener noreferrer" href="${homepage}">Demo/App</a>`;
  }

  markup += ` <a class="a-demo" rel="noopener noreferrer" href="${html_url}">To project</a>
      </p>
      </li>`;

  return markup;
}
