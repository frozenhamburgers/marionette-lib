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
    private float length = 1;
    private Vec3 direction = new Vec3(0,1,0);

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

    public float getLength() {
        return length;
    }

    public Vec3 getPartDirection() {
        return direction;
    }

    public void setPartDirection(Vec3 direction) {
        this.direction = direction.normalize();
    }

    public Vec3 getRootPos() {
        return this.position().subtract(direction.scale(length/2));
    }

    public Vec3 getEndPos() {
        return this.position().add(direction.scale(length/2));
    }

    public void setRootPos(Vec3 root) {
        setPartPos(root.add(direction.scale(length/2)));
    }

    public void setEndPos(Vec3 end) {
        setPartPos(end.subtract(direction.scale(length/2)));
    }


}
