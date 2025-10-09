package net.jelly.marionette_lib.utility;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;

public class AbstractPartEntity<T extends Entity> extends PartEntity<T> {
    Vec3 newPosition = null;
    public float length = 1;
    public Vec3 direction = new Vec3(0,1,0);

    public AbstractPartEntity(T parent) {
        super(parent);
        this.blocksBuilding = true;
    }

    public void setPartPos(Vec3 pos) {
        setPartPos(pos.x, pos.y, pos.z);
    }

    public void setPartPos(double x, double y, double z) {
        newPosition = new Vec3(x,y,z);
    }

    @Override
    public Vec3 position() {
        if(newPosition != null) return newPosition;
        else return super.position();
    }

    // call this after finalizing positions
    public void tick() {
        if(newPosition != null) {
            this.xo = this.getX();
            this.yo = this.getY();
            this.zo = this.getZ();
            this.xOld = this.getX();
            this.yOld = this.getY();
            this.zOld = this.getZ();
            setPos(newPosition);
        }
        super.tick();
    }


//    @Override
//    public InteractionResult interact(Player player, InteractionHand hand) {
//        Entity parent = this.getParent();
//        if (parent == null) {
//            return InteractionResult.PASS;
//        } else {
//            if (player.level().isClientSide) {
//                AlexsCaves.sendMSGToServer(new MultipartEntityMessage(parent.getId(), player.getId(), 0, 0));
//            }
//            return parent.interact(player, hand);
//        }
//    }

    @Override
    public boolean save(CompoundTag tag) {
        return false;
    }


    @Override
    public boolean canBeCollidedWith() {
        Entity parent = this.getParent();
        return parent != null && parent.canBeCollidedWith();
    }


    @Override
    public boolean isPickable() {
        Entity parent = this.getParent();
        return parent != null && parent.isPickable();
    }


//    @Override
//    public boolean hurt(DamageSource source, float amount) {
//        Entity parent = this.getParent();
//        if (!this.isInvulnerableTo(source) && parent != null) {
//            Entity player = source.getEntity();
//            if (player != null && player.level().isClientSide) {
//                AlexsCaves.sendMSGToServer(new MultipartEntityMessage(parent.getId(), player.getId(), 1, amount));
//            }
//        }
//        return false;
//    }

    @Override
    public boolean is(Entity entityIn) {
        return this == entityIn || this.getParent() == entityIn;
    }

//    @Override
//    public Packet<ClientGamePacketListener> getAddEntityPacket() {
//        throw new UnsupportedOperationException();
//    }

    @Override
    protected void defineSynchedData() {

    }

    @Override
    protected void readAdditionalSaveData(CompoundTag compound) {

    }

    @Override
    protected void addAdditionalSaveData(CompoundTag compound) {

    }

    public boolean shouldBeSaved() {
        return false;
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
