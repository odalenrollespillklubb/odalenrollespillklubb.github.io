// Skjemaet sendes via Formspree (formspree.io), som videresender det som e-post.
// Mottakeradressen settes i Formspree-kontoen, ikke her. Selve adressen står i
// skjemaets action-attributt i index.html, så skjemaet virker også uten JavaScript.

const contactForm = document.querySelector('.contact-form');
const contactMessage = document.getElementById('contact-form-message');
const contactSuccess = document.getElementById('contact-form-success');
const ERROR_TEXT = 'Noe gikk galt, og meldingen ble ikke sendt. Prøv igjen, eller send oss en e-post direkte.';

function showError() {
  contactMessage.textContent = ERROR_TEXT;
  contactMessage.classList.add('form-message--error');
  contactMessage.hidden = false;
  contactMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Swap the form for a big, unmissable confirmation and bring it into view
function showSuccess() {
  contactForm.reset();
  contactForm.hidden = true;
  contactSuccess.hidden = false;
  contactSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
  contactSuccess.focus({ preventScroll: true });
}

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('.btn-send');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sender…';
    contactMessage.hidden = true;

    const data = new FormData(contactForm);
    data.append('_subject', '[Kontaktskjema] ' + data.get('emne'));

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (response.ok) showSuccess();
      else showError();
    } catch (err) {
      showError();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send';
    }
  });

  document.getElementById('contact-form-again').addEventListener('click', () => {
    contactSuccess.hidden = true;
    contactForm.hidden = false;
    document.getElementById('navn').focus();
  });
}
