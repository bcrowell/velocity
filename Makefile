HTML = /home/bcrowell/Lightandmatter/velocity

install:
	install -D velocity.html $(HTML)/index.html
	install velocity.css velocity.js  $(HTML)
