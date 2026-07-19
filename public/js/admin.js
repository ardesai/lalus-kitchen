(function () {
  'use strict';

  const fileInput = document.querySelector('input[type="file"][name="image"]');
  if (!fileInput) return;

  const preview = document.createElement('img');
  preview.className = 'current-image-preview';
  preview.style.display = 'none';
  fileInput.insertAdjacentElement('afterend', preview);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      preview.style.display = 'none';
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  });
})();
