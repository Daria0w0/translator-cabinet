import { useEffect } from 'react';

interface MetaOptions {
  title: string;
  description?: string;
  canonical?: string;        
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;          
  noIndex?: boolean;        
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'Translator Cabinet';
const BASE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';

export function useMeta({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogType = 'website',
  noIndex = false,
  jsonLd,
}: MetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | ${SITE_NAME}`;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      let created = false;
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
        created = true;
      }
      el.setAttribute(attr, value);
      return { el, created };
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      let created = false;
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
        created = true;
      }
      el.href = href;
      return { el, created };
    };

    const elements: { el: Element; created: boolean; attr?: string; prev?: string }[] = [];

    if (description) {
      const { el, created } = setMeta('meta[name="description"]', 'name', 'description');
      const prev = el.getAttribute('content') ?? '';
      el.setAttribute('content', description);
      elements.push({ el, created, attr: 'content', prev });
    }

    {
      const content = noIndex ? 'noindex, nofollow' : 'index, follow';
      const { el, created } = setMeta('meta[name="robots"]', 'name', 'robots');
      const prev = el.getAttribute('content') ?? '';
      el.setAttribute('content', content);
      elements.push({ el, created, attr: 'content', prev });
    }

    if (canonical) {
      const { el, created } = setLink('canonical', canonical);
      elements.push({ el, created });
    }

    const og: Array<[string, string]> = [
      ['og:type',        ogType],
      ['og:site_name',   SITE_NAME],
      ['og:title',       ogTitle  ?? title],
      ['og:description', ogDescription ?? description ?? ''],
      ['og:url',         canonical ?? (BASE_URL + window.location.pathname)],
    ];

    for (const [property, content] of og) {
      const { el, created } = setMeta(
        `meta[property="${property}"]`,
        'property',
        property,
      );
      const prev = el.getAttribute('content') ?? '';
      el.setAttribute('content', content);
      elements.push({ el, created, attr: 'content', prev });
    }

    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;

      for (const { el, created, attr, prev } of elements) {
        if (created) {
          el.parentNode?.removeChild(el);
        } else if (attr && prev !== undefined) {
          el.setAttribute(attr, prev);
        }
      }

      if (scriptEl) {
        scriptEl.parentNode?.removeChild(scriptEl);
      }
    };
  }, [title, description, canonical, ogTitle, ogDescription, ogType, noIndex]);
}