import math

# We want a viewBox of 0 0 1000 420.
# Center of the logo will be around (500, 220).
# Let's craft the vector paths for:
# 1) The filled calligraphy logo paths (fillRule="nonzero" or multiple paths with clean outlines).
# 2) The reveal stroke paths that exactly cover them with stroke-width 42-50.

# Let's write the paths clearly.
print("Creating logo paths generator...")
