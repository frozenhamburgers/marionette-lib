package net.jelly.marionette_lib.utility;

import net.minecraft.world.entity.Entity;
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
 * @Override public boolean isMultipartEntity() { return true; }
 * @Override public PartEntity<?>[] getParts() { return getMarionetteParts(); }
 * @Override public void remove(RemovalReason reason) { super.remove(reason); removeMarionette(reason); }
 * }</pre>
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
}
