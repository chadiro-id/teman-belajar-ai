// Theme Settings
const storageKey = 'theme-preference';
const btnToggleTheme = document.getElementById("btn-toggle-theme");

const onThemeToggleButtonClicked = () => {
  theme.value = theme.value === 'light'? 'dark' : 'light';
  setPreference();
};

const getColorPreference = () => {
  if (localStorage.getItem(storageKey)) {
    return localStorage.getItem(storageKey)
  }
  else {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
};

const theme = {
  value: getColorPreference(),
};

const setPreference = () => {
  localStorage.setItem(storageKey, theme.value);
  reflectPreference();
};

const reflectPreference = () => {
  document.firstElementChild.setAttribute('data-theme', theme.value);
  btnToggleTheme?.setAttribute('aria-label', theme.value);
};

// set the initial value of the theme based on the system preference or local storage
reflectPreference();
window.addEventListener("load", () => {
  reflectPreference();
  btnToggleTheme?.addEventListener('click', onThemeToggleButtonClicked);
});

// listen for changes to the system preference and update the theme accordingly
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ({matches:isDark}) => {
  theme.value = isDark ? 'dark' : 'light';
  setPreference()
});