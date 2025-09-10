export const generateEventId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const counterPart = (performance.now() * 1000).toString(36).substring(0, 4);
  return `${timestamp}-${randomPart}-${counterPart}`;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

export const setCookie = (name: string, value: string, days: number): void => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

export const getLocalStorage = <T = unknown>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
  } catch (e) {
    console.warn(`Failed to get localStorage item ${key}:`, e);
    return null;
  }
};

export const setLocalStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to set localStorage item ${key}:`, e);
  }
};

export const getSessionStorage = <T = unknown>(key: string): T | null => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
  } catch (e) {
    console.warn(`Failed to get sessionStorage item ${key}:`, e);
    return null;
  }
};

export const setSessionStorage = <T>(key: string, value: T): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to set sessionStorage item ${key}:`, e);
  }
};

export const isBot = (): boolean => {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /crawl/i,
    /slurp/i,
    /mediapartners/i,
    /adsbot/i,
    /googlebot/i,
    /bingbot/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /slackbot/i,
  ];
  
  const userAgent = navigator.userAgent;
  return botPatterns.some(pattern => pattern.test(userAgent));
};

export const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'api_key', 'access_token'];
    sensitiveParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    return urlObj.toString();
  } catch (e) {
    return url;
  }
};

export const getPageMetadata = () => {
  const metaTags: Record<string, string> = {};
  const metas = document.getElementsByTagName('meta');
  
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i];
    if (!meta) continue;
    const name = meta.getAttribute('name') || meta.getAttribute('property');
    const content = meta.getAttribute('content');
    
    if (name && content) {
      metaTags[name] = content;
    }
  }
  
  return {
    title: document.title,
    description: metaTags['description'] || '',
    keywords: metaTags['keywords'] || '',
    author: metaTags['author'] || '',
    ogTitle: metaTags['og:title'] || '',
    ogDescription: metaTags['og:description'] || '',
    ogImage: metaTags['og:image'] || '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
  };
};