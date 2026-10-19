const sectionNav = document.getElementById('section-nav');

if (sectionNav) {
  const navLinks = Array.from(sectionNav.querySelectorAll('a'));
  const linkBySection = new Map();

  navLinks.forEach(link => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section) linkBySection.set(section, link);
  });

  function setActive(link) {
    navLinks.forEach(l => {
      const isActive = l === link;
      l.classList.toggle('active', isActive);
      if (isActive) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });

    // Keep the active link visible when the bar scrolls sideways (mobile)
    if (link && sectionNav.scrollWidth > sectionNav.clientWidth) {
      const left = link.offsetLeft - (sectionNav.clientWidth - link.offsetWidth) / 2;
      sectionNav.scrollTo({ left, behavior: 'smooth' });
    }
  }

  // A section counts as "current" while it crosses the middle of the viewport
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(linkBySection.get(entry.target));
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  linkBySection.forEach((link, section) => observer.observe(section));

  // Back up in the hero: nothing is current
  const hero = document.getElementById('hero');
  if (hero) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setActive(null);
    }, { rootMargin: '-50% 0px -50% 0px' }).observe(hero);
  }
}
