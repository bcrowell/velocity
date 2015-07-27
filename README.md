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

Currently I'm doing the definition using Holoborodko's method, and after that some smoothing by convolution with a triangle
(haven't tried the TVD technique).
