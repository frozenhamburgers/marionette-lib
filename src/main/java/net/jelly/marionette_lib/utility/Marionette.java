package net.jelly.marionette_lib.utility;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;

import java.util.ArrayList;
import java.util.List;

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
        getLimbs().forEach(limb -> limb.animator().tickMultipart());
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
