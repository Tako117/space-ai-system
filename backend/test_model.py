import sys
sys.path.append('c:/Users/User/Desktop/space-ai-system/backend')
from ai.ml_model import get_model

m = get_model()
m.load()

# Test 1: diverging very fast
p1 = m.predict(closest_approach_km=10000.0, relative_velocity_kms=15.0, time_to_closest_min=0.0, altitude_difference_km=500.0)
# Test 2: diverging kind of fast
p2 = m.predict(closest_approach_km=5000.0, relative_velocity_kms=14.0, time_to_closest_min=0.0, altitude_difference_km=300.0)
# Test 3: approaching
p3 = m.predict(closest_approach_km=0.1, relative_velocity_kms=14.0, time_to_closest_min=1.0, altitude_difference_km=1.0)
# Test 4: exactly identical very far away items
p4 = m.predict(closest_approach_km=150000.0, relative_velocity_kms=7.8, time_to_closest_min=0.0, altitude_difference_km=400.0)

print(f"ML Test 1: {p1.probability if p1 else 'None'}")
print(f"ML Test 2: {p2.probability if p2 else 'None'}")
print(f"ML Test 3: {p3.probability if p3 else 'None'}")
print(f"ML Test 4: {p4.probability if p4 else 'None'}")
