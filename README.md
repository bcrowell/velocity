Velocity
========

A browser-based application that graphs the position, velocity, and optionally the
acceleration, of the computer mouse.

There are various options that can be supplied in a query string such as
"?foo,bar" following the URL. The most useful of these is "noa," which suppresses
the acceleration graph. Other options are documented in the source code and are
meant for things like testing and fiddling with technical details.

Technical notes
---------------
Numerical differentiation of a noisy signal is in general a difficult thing to do.
Some info:

total variation denoising:
  * https://en.wikipedia.org/wiki/Total_variation_denoising
  * http://www.maxlittle.net/software/
  * Chartrand, "Numerical differentiation of noisy, nonsmooth data," http://math.lanl.gov/Research/Publications/Docs/chartrand-2007-numerical.pdf
  * Rudin, Osher, and Fatemi, "Nonlinear total variation based noise removal algorithms," http://www.csee.wvu.edu/~xinl/courses/ee565/total_variation.pdf

numerical differentiation in the presence of noise:
  * Holoborodko, "Smooth noise-robust differentiators," http://www.holoborodko.com/pavel/numerical-methods/numerical-derivative/smooth-low-noise-differentiators/

General ideas about this topic: To get better noise suppression, you always need to have a response to an impulse that is
wider. Naively just calculating the derivative as y(i)-y(i-1) amplifies noise, and gives poor results.
Holoborodko says, "One-sided filters have several disadvantages comparing to centered versions.
For example, to achieve the same noise suppression one-sided filter
should be much longer than centered one. Also they strongly amplify noise
in the mid-frequency range."
