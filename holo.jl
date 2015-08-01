N=41 # the length of the filter; should be odd

function fact(x)
  # factorial(BigInt(x))
  gamma(x+1)
end

function choose(x,y)
  # println(x," ",y)
  # div(fact(x),fact(y)*fact(x-y)) # div(,) is integer division
  fact(x)/(fact(y)*fact(x-y)) # div(,) is integer division
end

# http://www.holoborodko.com/pavel/numerical-methods/numerical-derivative/smooth-low-noise-differentiators/
function holo_numerator(m,k)
  if k==m+1
    1
  else
    choose(2m,m-k+1)-choose(2m,m-k-1)
  end
end

# coefficients for numerical differentiation
function holo(m,k)
  holo_numerator(m,k)/2^(2m+1)
end

# coefficients for numerical second differentiation
# http://www.holoborodko.com/pavel/numerical-methods/numerical-derivative/smooth-low-noise-differentiators/
# http://www.holoborodko.com/pavel/wp-content/plugins/download-monitor/download.php?id=8
# calculate the coefficient H. notates as s(k)
# gives wrong answer for k=0
function holo2_numerator(k,M,N)
  if k>M
    0
  else
    if k==M then
      1
    else
      ((2N-10)*holo2_numerator(k+1,M,N)-(N+2k+3)*holo2_numerator(k+2,M,N))/(N-2k-1)
    end
  end
end

m=(N-3)/2
M=(N-1)/2
# println("m=",m," N=",N," M=",M)
println("length=",N)
println("radius=",(N-1)/2)

print("holo_",N," = [0,")
for k in 1:M
  print(holo(m,k))
  if k<M
    print(",")
  end
end
println("]")

s0 = 0
for k in 1:M
  s0 = s0-2*holo2_numerator(k,M,N)
end
s0 = s0/2^(N-3)
print("holo2_",N," = [",s0,",")
for k in 1:M
  print(holo2_numerator(k,M,N)/2^(N-3))
  if k<M
    print(",")
  end
end
println("]")
