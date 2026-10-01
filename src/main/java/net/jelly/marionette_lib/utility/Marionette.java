package net.jelly.marionette_lib.utility;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;

import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Implemented by an {@link Entity} made of one or more {@link Limb}s.
 * <p>
 * The entity still has to forward {@code isMultipartEntity()}, {@code getParts()},
 * and {@code remove()} to the defaults below itself (Forge's {@code Entity} already
 * defines concrete versions of those methods, which win over interface defaults):
 * <pre>{@code
 */
public interface Marionette {
    List<Limb<?>> getLimbs();

    /**
     * up for this entity, world space. pins the roll of every limb that does not set its own
     */
    default Vec3 marionetteUp() {
        return new Vec3(0, 1, 0);
    }

    /**
     * best fit plane normal through {@code points}, Newell's method. winding decides the sign, so go
     * round the body, not down one side and back: a bowtie cancels and silently falls back to
     * {@code (0, 1, 0)}, as do fewer than three points and a collinear set. prefer
     * {@link #surfaceNormalToward(Vec3, Vec3...)}, which has no ordering to get wrong
     */
    static Vec3 surfaceNormal(Vec3... points) {
        if (points.length < 3) return new Vec3(0, 1, 0);

        double x = 0, y = 0, z = 0;
        for (int i = 0; i < points.length; i++) {
            Vec3 current = points[i];
            Vec3 next = points[(i + 1) % points.length];
            x += (current.y - next.y) * (current.z + next.z);
            y += (current.z - next.z) * (current.x + next.x);
            z += (current.x - next.x) * (current.y + next.y);
        }

        Vec3 normal = new Vec3(x, y, z);
        if (normal.lengthSqr() < 1.0e-8) return new Vec3(0, 1, 0);
        return normal.normalize();
    }

    /**
     * best fit plane normal through {@code points}, signed towards {@code upPosition} instead of by
     * winding, so the order the points arrive in does not matter. pass the entity's position and its
     * feet and the sign follows it when it inverts.
     * <p>
     * NOT an overload of {@link #surfaceNormal(Vec3...)} on purpose: a leading {@code Vec3} would make
     * it the more specific of the two, so existing three-point calls would quietly resolve to it.
     * <p>
     * falls back to {@code (0, 1, 0)} for fewer than three points, a collinear set, or an
     * {@code upPosition} already in the plane, where there is no side to pick
     */
    static Vec3 surfaceNormalToward(Vec3 upPosition, Vec3... points) {
        if (points.length < 3) return new Vec3(0, 1, 0);

        Vec3 centre = Vec3.ZERO;
        for (Vec3 point : points) centre = centre.add(point);
        centre = centre.scale(1.0 / points.length);

        Vec3 reference = upPosition.subtract(centre);
        if (reference.lengthSqr() < 1.0e-8) return new Vec3(0, 1, 0);

        // every pair of spokes off the centre gives a normal, area weighted by the cross product's own
        // length, flipped onto the reference's side before summing. that flip drops the winding dependence
        Vec3 normal = Vec3.ZERO;
        for (int i = 0; i < points.length; i++) {
            for (int j = i + 1; j < points.length; j++) {
                Vec3 term = points[i].subtract(centre).cross(points[j].subtract(centre));
                normal = normal.add(term.dot(reference) < 0 ? term.reverse() : term);
            }
        }

        if (normal.lengthSqr() < 1.0e-8) return new Vec3(0, 1, 0);
        return normal.normalize();
    }

    default PartEntity<?>[] getMarionetteParts() {
        List<PartEntity<?>> allParts = new ArrayList<>();
        for (Limb<?> limb : getLimbs()) {
            for (MarionettePart<?> part : limb.parts()) allParts.add(part);
        }
        return allParts.toArray(new PartEntity<?>[0]);
    }

    default void tickMarionette() {
        List<Limb<?>> limbs = getLimbs();

        // declaration order is already right unless something is attached, and skipping the sort keeps
        // the common case allocating nothing beyond whatever getLimbs() itself does
        boolean attached = false;
        for (Limb<?> limb : limbs) {
            if (limb.animator().getRootPart() != null) {
                attached = true;
                break;
            }
        }

        for (Limb<?> limb : attached ? tickOrder(limbs) : limbs) limb.animator().tickMultipart();
    }

    /**
     * {@code limbs} ordered so a limb attached to another limb's part ticks after it, since
     * {@link FabrikAnimator#attachRoot(MarionettePart, Vec3)} reads the root from wherever that part is
     * right now. Neither {@link #getLimbs()} nor {@link #getMarionetteParts()} is reordered: part order
     * is index-aligned with the model's segment name array, so touching it would pair model parts with
     * the wrong segments.
     */
    private List<Limb<?>> tickOrder(List<Limb<?>> limbs) {
        Map<MarionettePart<?>, Limb<?>> owners = new IdentityHashMap<>();
        for (Limb<?> limb : limbs) {
            for (MarionettePart<?> part : limb.parts()) owners.put(part, limb);
        }

        List<Limb<?>> order = new ArrayList<>(limbs.size());
        Set<Limb<?>> placed = Collections.newSetFromMap(new IdentityHashMap<>());
        Set<Limb<?>> visiting = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Limb<?> limb : limbs) place(limb, owners, order, placed, visiting);
        return order;
    }

    // limbs attached to each other in a cycle have no valid order at all, so one already being walked
    // is left wherever it lands rather than recursing forever
    private void place(Limb<?> limb, Map<MarionettePart<?>, Limb<?>> owners, List<Limb<?>> order,
                       Set<Limb<?>> placed, Set<Limb<?>> visiting) {
        if (placed.contains(limb) || !visiting.add(limb)) return;

        MarionettePart<?> rootPart = limb.animator().getRootPart();
        Limb<?> parent = rootPart == null ? null : owners.get(rootPart);
        if (parent != null && parent != limb) place(parent, owners, order, placed, visiting);

        visiting.remove(limb);
        placed.add(limb);
        order.add(limb);
    }

    default void removeMarionette(Entity.RemovalReason reason) {
        for (PartEntity<?> part : getMarionetteParts()) part.remove(reason);
    }

    /**
     * Bounding box covering {@code entity} and all its parts. Override a renderer's
     * {@code getBoundingBoxForCulling} to return this
     */
    default AABB getMarionetteBoundingBoxForCulling(Entity entity) {
        AABB box = entity.getBoundingBox();
        for (PartEntity<?> part : getMarionetteParts()) {
            box = box.minmax(part.getBoundingBox());
        }
        return box;
    }
}
