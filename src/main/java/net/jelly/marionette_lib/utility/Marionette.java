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
