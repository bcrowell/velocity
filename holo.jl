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

function holo(m,k)
  holo_numerator(m,k)/2^(2m+1)
end

#println(holo(4,1));

m=20
N=2m+3
M=(N-1)/2
# println("m=",m," N=",N," M=",M)
print("holo_",m+1," = [0,")
for k in 1:M
  print(holo(m,k))
  if k<M
    print(",")
  end
end
println("]")
