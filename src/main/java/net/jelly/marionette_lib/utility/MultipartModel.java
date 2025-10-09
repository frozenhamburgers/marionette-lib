package net.jelly.marionette_lib.utility;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.EntityModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.builders.*;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;

public abstract class MultipartModel<T extends Entity> extends EntityModel<T> {

    /** array of model parts corresponding to segment names */
    protected ModelPart[] allSegments;

    public static LayerDefinition createBodyLayer() {
        MeshDefinition meshdefinition = new MeshDefinition();
        PartDefinition partdefinition = meshdefinition.getRoot();

        /**
         * Set up parts corresponding to segment names. If you initialize segmentNames with the same names as the parts in blockbench, you should be fine.
         *
         * E.g.
         * PartDefinition segment1 = partdefinition.addOrReplaceChild("segment1", CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -1.0F, 2.0F, 2.0F, 4.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));
         * PartDefinition segment2 = partdefinition.addOrReplaceChild("segment2", CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -1.0F, 2.0F, 2.0F, 4.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));
         * PartDefinition segment3 = partdefinition.addOrReplaceChild("segment3...", CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -1.0F, 2.0F, 2.0F, 4.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));
         */

        return LayerDefinition.create(meshdefinition, 16, 16);
    }

    /**
     * What is segmentNames?
     * Pass in names of the folders containing the geometry of each segment in blockbench
     * Note that the index of the part will correspond go the part entity at the same index in the multipart entity's part list
     * */
    public MultipartModel(ModelPart root, String[] segmentNames) {
        allSegments = new ModelPart[segmentNames.length];
        for(int i=0 ; i<segmentNames.length; i++) {
            allSegments[i] = root.getChild(segmentNames[i]);
        }
    }

    @Override
    public void renderToBuffer(PoseStack poseStack, VertexConsumer vertexConsumer, int packedLight, int packedOverlay, float red, float green, float blue, float alpha) {
        for(int i=0 ; i<allSegments.length; i++) {
            allSegments[i].render(poseStack, vertexConsumer, packedLight, packedOverlay, red, green, blue, alpha);
        }
    }

    /**
     * Set up animation such that model parts track the part entity they correspond to.
     * */
    @Override
    public void setupAnim(T entity, float pLimbSwing, float pLimbSwingAmount, float ageInTicks, float pNetHeadYaw, float pHeadPitch) {
        AbstractPartEntity[] allParts = (AbstractPartEntity[])(entity.getParts());
        float partialTicks = ageInTicks - entity.tickCount;
        for(int i=0 ; i<allSegments.length; i++) {
            Vec3 dirVec = allParts[i].getPartDirection().normalize();
//            Vec3 upVec = Math.abs(dirVec.dot(new Vec3(0, 1, 0))) > 0.99 ? new Vec3(1, 0, 0) : new Vec3(0, 1, 0);
//            Vec3 right = dirVec.cross(upVec).normalize();
//            upVec = right.cross(dirVec).normalize();

            float yaw = (float)(Math.atan2(-dirVec.x, dirVec.z));
            float pitch = (float)(Math.asin(dirVec.y));
            allSegments[i].setRotation(-pitch, yaw, 0f);


            Vec3 wormPos = entity.getPosition(partialTicks);
            Vec3 partPos = allParts[i].getPosition(partialTicks);
            double xOffset = partPos.x-wormPos.x;
            double yOffset = partPos.y-wormPos.y;
            double zOffset = partPos.z-wormPos.z;
            // default position of each part is (0,24,0). See PartDefinition definitions above to see why
            // 16 b/c 1 block is 16 units in model space
            allSegments[i].setPos((float)(16f*xOffset), (float) (24-16f*(yOffset + allParts[i].getBbHeight()/2)),(float)(-16f*zOffset));
        }

    }
}
