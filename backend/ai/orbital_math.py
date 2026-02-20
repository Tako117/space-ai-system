#backend/ai/orbital_math.py
import numpy as np


def vector(v):
    # v is Vector3 (x,y,z)
    return np.array([float(v.x), float(v.y), float(v.z)], dtype=np.float64)


def relative_motion(debris_pos, debris_vel, sat_pos, sat_vel):
    rel_pos = debris_pos - sat_pos
    rel_vel = debris_vel - sat_vel
    return rel_pos, rel_vel


def predict_min_distance(rel_pos, rel_vel):
    v_dot = float(np.dot(rel_vel, rel_vel))
    if v_dot <= 0.0:
        return float(np.linalg.norm(rel_pos)), 0.0

    t = -float(np.dot(rel_pos, rel_vel)) / v_dot
    t = max(t, 0.0)

    closest = rel_pos + rel_vel * t
    distance = float(np.linalg.norm(closest))
    return distance, float(t)
