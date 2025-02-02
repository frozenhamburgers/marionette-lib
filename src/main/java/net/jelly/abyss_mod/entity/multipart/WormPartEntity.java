package net.jelly.abyss_mod.entity.multipart;

import net.minecraft.client.renderer.entity.EnderDragonRenderer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.Pose;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

public class WormPartEntity extends AbstractPartEntity<WormEntity>{
    private EntityDimensions size;
    public float scale = 1;
    private final Entity connectedTo;

    public WormPartEntity(WormEntity parent, Entity connectedTo, float sizeXZ, float sizeY) {
        super(parent);
        this.connectedTo = connectedTo;
        this.size = EntityDimensions.fixed(sizeXZ, sizeY);
        this.refreshDimensions();
    }

    public EntityDimensions getDimensions(Pose pose) {
        return size;
    }

    public AABB getBoundingBoxForCulling() {
        return this.getBoundingBox().inflate(1.0D, 1.0D, 1.0D);
    }

}
