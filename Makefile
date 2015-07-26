HTML = /home/bcrowell/Lightandmatter/velocity

install:
	install -D velocity.html $(HTML)/index.html
	install velocity.css load_external_js.js velocity.js  $(HTML)
