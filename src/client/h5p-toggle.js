// Create content results data view
(function ($) {
  $(document).ready(function () {
    $('.h5p-toggle').each(function (i, e) {
      var $btn = $(e);
      var $panel = $btn.nextUntil('.h5p-panel');
      if (!$panel.length) {
        return;
      }
      var $parent = $btn.parent();

      var toggle = function () {
        if ($parent.hasClass('h5p-closed')) {
          $parent.removeClass('h5p-closed');
          $btn.attr('aria-expanded', true);
        }
        else {
          $parent.addClass('h5p-closed');
          $btn.attr('aria-expanded', false);
        }
      };
      $btn.click(toggle).keypress(function (event) {
        if (event.which === 32) {
          toggle();
        }
      });
    });
  });
})(H5P.jQuery);
